import {test,expect,type Page} from '@playwright/test'

const movie={id:'arrival',libraryId:'movies',kind:'movie',title:'Arrival',year:2016,unresolved:false}
const show={id:'show',libraryId:'tv',kind:'show',title:'Example Show',unresolved:false}
const season={id:'season',libraryId:'tv',parentId:'show',kind:'season',title:'Season 1',seasonNumber:1,unresolved:false}
const episode={id:'episode',libraryId:'tv',parentId:'season',kind:'episode',title:'Episode One',seasonNumber:1,episodeNumber:1,unresolved:false}
const items=[movie,show,season,episode]
const mediaSource={id:'source',container:'mp4',durationMs:10000,bitrate:1000000,width:640,height:360,videoCodec:'h264',audioCodec:'aac',hdr:false,available:true}
const detail=(item:typeof movie|typeof show|typeof season|typeof episode)=>({item,sources:[mediaSource],parts:[{id:'part',sourceId:'source',size:100,available:true}],streams:[{id:'stream',partId:'part',kind:'video',index:0,codec:'h264'}],knowledge:[]})

async function fakeServer(page:Page,initialized=true){
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method()
  const json=(value:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)})
  if(path==='/api/v1/server')return json({id:'test-server',name:'Living Room',apiVersions:['v1'],initialized})
  if(path==='/api/v1/setup/bootstrap')return json({token:'local-token',user:{id:'u1',username:'admin',admin:true}},201)
  if(path==='/api/v1/auth/login')return json({token:'local-token',user:{id:'u1',username:'admin',admin:true}})
  if(path==='/api/v1/auth/logout')return route.fulfill({status:204})
  if(path==='/api/v1/libraries')return json({libraries:[{id:'movies',name:'Movies',mediaType:'movies',enabled:true},{id:'tv',name:'TV',mediaType:'tv',enabled:true}]})
  if(path==='/api/v1/items'){
   const kind=url.searchParams.get('kind'),parent=url.searchParams.get('parentId'),q=url.searchParams.get('q')?.toLowerCase()
   return json({items:items.filter(i=>(!kind||i.kind===kind)&&(!parent||('parentId'in i&&i.parentId===parent))&&(!q||i.title.toLowerCase().includes(q))),nextCursor:''})
  }
  if(path.startsWith('/api/v1/items/')){
   const id=decodeURIComponent(path.split('/').at(-1)??'')
   const item=items.find(i=>i.id===id)
   return item?json(detail(item)):json({error:{code:'NOT_FOUND',message:'Item not found'}},404)
  }
  if(path==='/api/v1/playback/decide')return json({mode:'DIRECT_PLAY',sourceId:'source',partId:'part',url:'/api/v1/media/part/content',reasons:[]})
  if(path==='/api/v1/playback/sessions' && method==='POST')return json({id:'session',itemId:'arrival',clientId:'browser',state:'playing',decision:'DIRECT_PLAY',positionMs:0},201)
  if(path.startsWith('/api/v1/playback/sessions/'))return method==='DELETE'?route.fulfill({status:204}):json({id:'session',state:'paused',positionMs:500})
  if(path.startsWith('/api/v1/users/me/playback/'))return json({error:{code:'NOT_FOUND',message:'No resume state'}},404)
  if(path.includes('/media/'))return route.fulfill({status:206,contentType:'video/mp4',body:'mock media'})
  return json({error:{code:'NOT_FOUND',message:'Unknown route'}},404)
 })
}

async function login(page:Page){
 await page.goto('/')
 await page.getByLabel('Username').fill('admin')
 await page.getByLabel('Password').fill('password123')
 await page.getByRole('button',{name:'Enter Mediaphile →'}).click()
 await expect(page.getByText('All your stories.')).toBeVisible()
}

test('first-run bootstrap creates a local session',async({page})=>{
 await fakeServer(page,false)
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Make it yours.'})).toBeVisible()
 await page.getByLabel('Setup secret').fill('secret')
 await page.getByLabel('Administrator username').fill('admin')
 await page.getByLabel('Password').fill('password123')
 await page.getByRole('button',{name:'Create local account →'}).click()
 await expect(page.getByRole('link',{name:/Explore Movies/})).toBeVisible()
})

test('movies browse, detail and direct play initialize',async({page})=>{
 await fakeServer(page)
 await login(page)
 await page.getByRole('link',{name:'Movies',exact:true}).click()
 await expect(page.getByRole('link',{name:'Open Arrival'})).toBeVisible()
 await page.getByRole('link',{name:'Open Arrival'}).click()
 await expect(page.getByRole('heading',{name:'Arrival'})).toBeVisible()
 await page.getByRole('link',{name:/Play Movie/}).click()
 await expect(page.getByLabel('Playing Arrival')).toBeVisible()
 await expect(page.getByText('DIRECT PLAY',{exact:false})).toBeVisible()
})

test('TV navigation preserves show to season to episode',async({page})=>{
 await fakeServer(page)
 await login(page)
 await page.getByRole('link',{name:'TV Shows',exact:true}).click()
 await page.getByRole('link',{name:'Open Example Show'}).click()
 await page.getByRole('link',{name:'Open Season 1'}).click()
 await page.getByRole('link',{name:'Open Episode One'}).click()
 await expect(page.getByRole('heading',{name:'Episode One'})).toBeVisible()
})

test('D-pad navigates between sidebar links',async({page})=>{
 await fakeServer(page)
 await login(page)
 const home=page.getByRole('link',{name:'Home',exact:true})
 await home.focus()
 await page.keyboard.press('ArrowDown')
 await expect(page.getByRole('link',{name:'Movies',exact:true})).toBeFocused()
})

test('unreachable local server offers manual reconnect',async({page})=>{
 await page.route('**/api/v1/server',route=>route.abort())
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Find your library.'})).toBeVisible()
 await expect(page.getByLabel('Server address')).toBeVisible()
})

test('one left navigation layout survives desktop and phone viewports',async({page})=>{
 await fakeServer(page)
 await login(page)
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  await page.setViewportSize(viewport)
  const rail=page.locator('aside.sidebar')
  await expect(rail).toBeVisible()
  const bounds=await rail.boundingBox()
  expect(bounds).toBeTruthy()
  expect(bounds!.x).toBe(0)
  expect(bounds!.height).toBeGreaterThan(viewport.height-5)
  await expect(rail.getByRole('link',{name:'Home'})).toBeVisible()
  await expect(rail.getByRole('link',{name:'Movies'})).toBeVisible()
  await expect(rail.getByRole('link',{name:'TV Shows'})).toBeVisible()
  await expect(rail.getByRole('link',{name:'Search'})).toBeVisible()
  await expect(rail.getByRole('link',{name:'Settings'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 }
})

test('library browse offers a library selector, watched filter and grid/list modes',async({page})=>{
 await fakeServer(page)
 await login(page)
 await page.getByRole('link',{name:'Movies',exact:true}).click()
 await expect(page.getByLabel('Library',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Watch status')).toBeVisible()
 await page.getByLabel('Library',{exact:true}).selectOption('movies')
 const request=page.waitForRequest(req=>req.url().includes('/api/v1/items')&&new URL(req.url()).searchParams.get('watchState')==='watched')
 await page.getByLabel('Watch status').selectOption('watched')
 await request
 await page.getByRole('button',{name:'List view'}).click()
 await expect(page.locator('.poster-list')).toBeVisible()
 await page.getByRole('button',{name:'Grid view'}).click()
 await expect(page.locator('.poster-grid')).toBeVisible()
})

test('large libraries are paginated instead of silently capped',async({page})=>{
 await fakeServer(page)
 await login(page)
 const batch=Array.from({length:25},(_,i)=>({
  id:'movie-'+i,libraryId:'movies',kind:'movie',title:'Film '+String(i).padStart(2,'0'),year:2020,unresolved:false
 }))
 await page.route('**/api/v1/items?**',async route=>{
  const url=new URL(route.request().url())
  if(url.searchParams.get('kind')!=='movie')return route.fallback()
  const cursor=url.searchParams.get('cursor')
  const pageItems=cursor==='next-page'?batch.slice(24):batch.slice(0,24)
  await route.fulfill({contentType:'application/json',body:JSON.stringify({items:pageItems,nextCursor:cursor?'':'next-page'})})
 })
 await page.getByRole('link',{name:'Movies',exact:true}).click()
 await expect(page.getByRole('link',{name:'Open Film 00'})).toBeVisible()
 await expect(page.getByRole('link',{name:'Open Film 24'})).toHaveCount(0)
 await page.getByRole('button',{name:'Load more'}).click()
 await expect(page.getByRole('link',{name:'Open Film 24'})).toBeVisible()
 await expect(page.getByRole('link',{name:'Open Film 00'})).toHaveCount(1)
 await expect(page.getByRole('button',{name:'Load more'})).toHaveCount(0)
})

test('home Continue Watching is driven by authenticated server playback state',async({page})=>{
 await fakeServer(page)
 await page.route('**/api/v1/users/me/continue-watching**',async route=>{
  await route.fulfill({contentType:'application/json',body:JSON.stringify({items:[
   {item:episode,resumeMs:125000,lastPlayedAt:'2026-10-07 15:00:00'},
   {item:movie,resumeMs:30000,lastPlayedAt:'2026-10-06 15:00:00'}
  ]})})
 })
 await login(page)
 await expect(page.getByRole('heading',{name:'Continue Watching'})).toBeVisible()
 await expect(page.getByRole('link',{name:/Resume Episode One/})).toBeVisible()
 await expect(page.getByRole('link',{name:/Resume Arrival/})).toBeVisible()
 await expect(page.getByText('2:05',{exact:true})).toBeVisible()
 await page.getByRole('link',{name:/Resume Arrival/}).click()
 await expect(page.getByLabel('Playing Arrival')).toBeVisible()
})

test('published subtitle install requires matching preview digest and explicit review confirmation',async({page})=>{
 await fakeServer(page)
 const stageId='a'.repeat(32),sha256='b'.repeat(64),otherSha='c'.repeat(64)
 const partId='part 1'
 const part={partId,fileName:'Example.mkv',review:{
  existing:[],existingAudits:[],candidates:[],coverage:'missing'},
  decision:{disposition:'active',reason:''},nextAction:'search_published',embedded:[]}
 const audit=(sha:string)=>({status:'ready',cues:1,sha256:sha,ocr:[],warnings:[]})
 let previews=0
 const installationBodies:unknown[]=[]
 await page.route('**/api/v1/libraries/movies/subtitles?**',route=>route.fulfill({
  contentType:'application/json',body:JSON.stringify({items:[part],total:1,limit:25,offset:0})
 }))
 await page.route('**/api/v1/subtitles/parts/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,method=request.method()
  const json=(value:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)})
  if(path.endsWith('/published/search')&&method==='POST')return json({partId,provider:'opensubtitles',
   downloaded:false,published:false,note:'metadata only',candidates:[{provider:'opensubtitles',subtitleId:'sub',
   fileId:42,release:'Example.WEB',fileName:'Example.srt',language:'en',trusted:true,
   hearingImpaired:false,moviehashMatch:false}]})
  if(path.endsWith('/published/stage')&&method==='POST')return json({partId,downloaded:true,published:false,
   note:'review',stage:{provider:'opensubtitles',fileId:42,stageId,sha256,audit:audit(sha256),readyForReview:true}},201)
  if(path.endsWith('/published/stages/'+stageId)&&method==='GET'){
   previews++
   const digest=previews===1?otherSha:sha256
   return json({partId,provider:'opensubtitles',fileId:42,stageId,sha256:digest,audit:audit(digest),
    readyForReview:true,published:false,text:'1\n00:00:01,000 --> 00:00:02,000\nHello from review\n<img src=x onerror=alert(1)>'})
  }
  if(path.endsWith('/published/stages/'+stageId+'/install')&&method==='POST'){
   installationBodies.push(request.postDataJSON())
   return json({destinationName:'Example.en.srt',sha256,bytes:66,source:'opensubtitles',alreadyInstalled:false},201)
  }
  if(method==='GET')return json(part)
  return json({error:{code:'NOT_FOUND',message:'Unmocked subtitle operation'}},404)
 })
 await login(page)
 await page.getByRole('link',{name:'Settings',exact:true}).click()
 await page.getByRole('button',{name:'Check subtitles'}).first().click()
 await page.getByRole('button',{name:'Review',exact:true}).click()
 await page.getByRole('button',{name:'Search published English subtitles'}).click()
 await page.getByRole('button',{name:/Download file 42 to review staging/}).click()
 await expect(page.getByRole('button',{name:'Preview staged subtitle for manual review'})).toBeVisible()
 expect(installationBodies).toHaveLength(0)
 await page.getByRole('button',{name:'Preview staged subtitle for manual review'}).click()
 await expect(page.getByRole('alert')).toContainText('changed since staging')
 await expect(page.getByRole('button',{name:'Install reviewed staged subtitle'})).toHaveCount(0)
 expect(installationBodies).toHaveLength(0)
 await page.getByRole('button',{name:'Preview staged subtitle for manual review'}).click()
 const preview=page.getByRole('region',{name:'Staged subtitle text preview'})
 await expect(preview).toContainText('Hello from review')
 await expect(preview.locator('img')).toHaveCount(0)
 const install=page.getByRole('button',{name:'Install reviewed staged subtitle'})
 await expect(install).toBeDisabled()
 await page.getByRole('checkbox',{name:/I reviewed the release, dialogue, and timing/}).check()
 await expect(install).toBeEnabled()
 await install.click()
 await expect(page.getByRole('status')).toContainText('Installed reviewed subtitle')
 expect(installationBodies).toEqual([{expectedSha256:sha256,confirmReviewed:true}])
 expect(previews).toBe(2)
})
