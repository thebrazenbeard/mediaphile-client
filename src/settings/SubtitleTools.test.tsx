import {describe,it,expect,vi,afterEach} from 'vitest'
import {render,fireEvent,screen,waitFor,cleanup,act} from '@testing-library/react'
import {SubtitleTools} from './SubtitleTools'
import type {ApiClient} from '../api/client'

afterEach(()=>cleanup())

describe('Subtitle Manager batch planning',()=>{
 it('shows persisted advisory actions without publishing subtitle files',async()=>{
  const api={
   subtitleOverview:vi.fn(async()=>({items:[],total:1,limit:25,offset:0})),
   refreshSubtitleQueue:vi.fn(async()=>({
    items:[{partId:'one',fileName:'Movie.mkv',action:'search_published',
    coverage:'missing',disposition:'active',candidateCount:0,
    observedSize:1024,observedModTimeNs:1}],planned:1,total:1,limit:25,offset:0
   })),
   reviewSubtitles:vi.fn(async()=>({
    partId:'one',fileName:'Movie.mkv',nextAction:'search_published',
    decision:{partId:'one',disposition:'active',reason:''},
    review:{englishEmbedded:false,existing:[],existingAudits:[],candidates:[],coverage:'missing'},embedded:[]
   }))
  } as unknown as ApiClient
  render(<SubtitleTools api={api} libraryId="lib"/>)
  await waitFor(()=>expect(screen.getByText(/1 indexed media parts/)).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:/inspect current page into recovery queue/i}))
  await waitFor(()=>expect(screen.getByText(/search_published/)).toBeTruthy())
  expect((api.refreshSubtitleQueue as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('lib',25,0)
  expect(screen.getByText(/planning only; no downloads or file changes/i)).toBeTruthy()
 })
})

it('requires separate deliberate search and staging clicks without offering publication',async()=>{
 const api={
  subtitleOverview:vi.fn(async()=>({items:[{partId:'p1',fileName:'Example (2026).mkv',review:{
   existing:[],existingAudits:[],candidates:[],coverage:'missing'},decision:{disposition:'active',reason:''},
   nextAction:'search_published',embedded:[]}],total:1,limit:25,offset:0})),
  reviewSubtitles:vi.fn(async()=>({partId:'p1',fileName:'Example (2026).mkv',
   review:{existing:[],existingAudits:[],candidates:[],coverage:'missing'},decision:{disposition:'active',reason:''},
   nextAction:'search_published',embedded:[]})),
  searchPublishedSubtitles:vi.fn(async()=>({partId:'p1',provider:'opensubtitles',downloaded:false,published:false,
   note:'metadata only',candidates:[{provider:'opensubtitles',subtitleId:'123',fileId:455,
   release:'Example.WEB',fileName:'Example.srt',language:'en',trusted:true,hearingImpaired:false,moviehashMatch:false}]})),
  stagePublishedSubtitle:vi.fn(async()=>({partId:'p1',downloaded:true,published:false,note:'review',
   stage:{provider:'opensubtitles',fileId:455,stageId:'a'.repeat(32),sha256:'b'.repeat(64),readyForReview:true,
    audit:{status:'ready',cues:12,sha256:'b'.repeat(64),ocr:[],warnings:[]}}}))
 } as unknown as ApiClient
 render(<SubtitleTools api={api} libraryId="library"/>)
 await waitFor(()=>expect(screen.getByText(/1 indexed media parts/)).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Review'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/search published English subtitles/i})).toBeTruthy())
 expect((api.searchPublishedSubtitles as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:/search published English subtitles/i}))
 await waitFor(()=>expect(screen.getByText(/Example.WEB/)).toBeTruthy())
 expect((api.searchPublishedSubtitles as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('p1','Example (2026)')
 expect(screen.getByRole('region',{name:'Published subtitle candidates'}).textContent).toContain('nothing downloaded or installed')
 expect((api.stagePublishedSubtitle as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:/download file 455 to review staging/i}))
 await waitFor(()=>expect(screen.getByRole('region',{name:'Staged subtitle review'}).textContent).toContain('12 cues'))
 expect((api.stagePublishedSubtitle as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('p1',455)
 expect(screen.getByRole('region',{name:'Staged subtitle review'}).textContent).toContain('not installed')
 expect(screen.queryByRole('button',{name:/install published/i})).toBeNull()
})

it('requires a separate preview and explicit review confirmation before installing a staged subtitle',async()=>{
 const api={
  subtitleOverview:vi.fn(async()=>({items:[{partId:'part 1',fileName:'Example.mkv',review:{
   existing:[],existingAudits:[],candidates:[],coverage:'missing'},decision:{disposition:'active',reason:''},
   nextAction:'search_published',embedded:[]}],total:1,limit:25,offset:0})),
  reviewSubtitles:vi.fn(async()=>({partId:'part 1',fileName:'Example.mkv',review:{
   existing:['Example.en.srt'],existingAudits:[],candidates:[],coverage:'external_english'},
   decision:{disposition:'active',reason:''},nextAction:'covered',embedded:[]})),
  searchPublishedSubtitles:vi.fn(async()=>({partId:'part 1',provider:'opensubtitles',candidates:[{
   provider:'opensubtitles',subtitleId:'sub',fileId:42,release:'Example.WEB',fileName:'Example.srt',
   language:'en',trusted:true,hearingImpaired:false,moviehashMatch:false}],downloaded:false,published:false,note:'metadata'})),
  stagePublishedSubtitle:vi.fn(async()=>({partId:'part 1',downloaded:true,published:false,note:'review',stage:{
   provider:'opensubtitles',fileId:42,stageId:'a'.repeat(32),sha256:'b'.repeat(64),readyForReview:true,
   audit:{status:'ready',cues:2,sha256:'b'.repeat(64),ocr:[],warnings:[]}}})),
  reviewPublishedSubtitleStage:vi.fn(async()=>({partId:'part 1',stageId:'a'.repeat(32),
   provider:'opensubtitles',fileId:42,sha256:'b'.repeat(64),readyForReview:true,published:false,
   audit:{status:'ready',cues:2,sha256:'b'.repeat(64),ocr:[],warnings:[]},
   text:'1\n00:00:01,000 --> 00:00:03,000\nHello from staged subtitles\n<img src=x onerror=alert(1)>\n'})),
  installPublishedSubtitleStage:vi.fn(async()=>({destinationName:'Example.en.srt',sha256:'b'.repeat(64),
   bytes:60,source:'opensubtitles',alreadyInstalled:false}))
 } as unknown as ApiClient
 render(<SubtitleTools api={api} libraryId="library"/>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Review'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/search published English subtitles/i})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:/search published English subtitles/i}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/download file 42/i})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:/download file 42/i}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/preview staged subtitle/i})).toBeTruthy())
 expect((api.reviewPublishedSubtitleStage as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
 expect((api.installPublishedSubtitleStage as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
 expect(screen.queryByRole('button',{name:/install reviewed staged subtitle/i})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:/preview staged subtitle/i}))
 await waitFor(()=>expect(screen.getByText(/Hello from staged subtitles/)).toBeTruthy())
 expect(screen.getByRole('region',{name:'Staged subtitle text preview'}).querySelector('img')).toBeNull()
 expect((api.reviewPublishedSubtitleStage as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('part 1','a'.repeat(32))
 const installButton=screen.getByRole('button',{name:/install reviewed staged subtitle/i}) as HTMLButtonElement
 expect(installButton.disabled).toBe(true)
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed the release, dialogue, and timing/i}))
 expect(installButton.disabled).toBe(false)
 fireEvent.click(installButton)
 await waitFor(()=>expect((api.installPublishedSubtitleStage as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
  'part 1','a'.repeat(32),'b'.repeat(64)))
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Installed reviewed subtitle'))
})

it('rejects a staged preview whose digest no longer matches the explicit download',async()=>{
 const api={
  subtitleOverview:vi.fn(async()=>({items:[{partId:'p1',fileName:'Example.mkv',review:{
   existing:[],existingAudits:[],candidates:[],coverage:'missing'},decision:{disposition:'active',reason:''},
   nextAction:'search_published',embedded:[]}],total:1,limit:25,offset:0})),
  reviewSubtitles:vi.fn(async()=>({partId:'p1',fileName:'Example.mkv',review:{
   existing:[],existingAudits:[],candidates:[],coverage:'missing'},decision:{disposition:'active',reason:''},
   nextAction:'search_published',embedded:[]})),
  searchPublishedSubtitles:vi.fn(async()=>({partId:'p1',provider:'opensubtitles',candidates:[{
   provider:'opensubtitles',subtitleId:'sub',fileId:42,release:'Example.WEB',fileName:'Example.srt',
   language:'en',trusted:true,hearingImpaired:false,moviehashMatch:false}],downloaded:false,published:false,note:'metadata'})),
  stagePublishedSubtitle:vi.fn(async()=>({partId:'p1',downloaded:true,published:false,note:'review',stage:{
   provider:'opensubtitles',fileId:42,stageId:'a'.repeat(32),sha256:'b'.repeat(64),readyForReview:true,
   audit:{status:'ready',cues:2,sha256:'b'.repeat(64),ocr:[],warnings:[]}}})),
  reviewPublishedSubtitleStage:vi.fn(async()=>({partId:'p1',stageId:'a'.repeat(32),
   provider:'opensubtitles',fileId:42,sha256:'c'.repeat(64),readyForReview:true,published:false,
   audit:{status:'ready',cues:2,sha256:'c'.repeat(64),ocr:[],warnings:[]},text:'changed'})),
  installPublishedSubtitleStage:vi.fn()
 } as unknown as ApiClient
 render(<SubtitleTools api={api} libraryId="lib"/>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Review'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/search published English subtitles/i})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:/search published English subtitles/i}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/download file 42/i})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:/download file 42/i}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/preview staged subtitle/i})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:/preview staged subtitle/i}))
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('changed since staging'))
 expect(screen.queryByRole('button',{name:/install reviewed staged subtitle/i})).toBeNull()
 expect((api.installPublishedSubtitleStage as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
})

it('discards a late staging reply after switching libraries',async()=>{
 let finishStage:((value:unknown)=>void)|undefined
 const pendingStage=new Promise<unknown>(resolve=>{finishStage=resolve})
 const part={partId:'old-part',fileName:'Old.mkv',review:{existing:[],existingAudits:[],candidates:[],coverage:'missing'},
  decision:{disposition:'active',reason:''},nextAction:'search_published',embedded:[]}
 const api={
  subtitleOverview:vi.fn(async(libraryId:string)=>({items:libraryId==='old'?[part]:[],total:libraryId==='old'?1:0,limit:25,offset:0})),
  reviewSubtitles:vi.fn(async()=>part),
  searchPublishedSubtitles:vi.fn(async()=>({partId:'old-part',provider:'opensubtitles',candidates:[{
   provider:'opensubtitles',subtitleId:'sub',fileId:42,release:'Old',fileName:'Old.srt',language:'en',
   trusted:true,hearingImpaired:false,moviehashMatch:false}],downloaded:false,published:false,note:'metadata'})),
  stagePublishedSubtitle:vi.fn(()=>pendingStage),
  installPublishedSubtitleStage:vi.fn()
 } as unknown as ApiClient
 const {rerender}=render(<SubtitleTools api={api} libraryId="old"/>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Review'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/search published English subtitles/i})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:/search published English subtitles/i}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/download file 42/i})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:/download file 42/i}))
 rerender(<SubtitleTools api={api} libraryId="new"/>)
 await waitFor(()=>expect(screen.getByText(/0 indexed media parts/)).toBeTruthy())
 await act(async()=>{finishStage?.({partId:'old-part',downloaded:true,published:false,note:'review',stage:{
  stageId:'a'.repeat(32),sha256:'b'.repeat(64),fileId:42,provider:'opensubtitles',readyForReview:true,
  audit:{status:'ready',cues:1,sha256:'b'.repeat(64),ocr:[],warnings:[]}}})})
 expect(screen.queryByRole('status')).toBeNull()
 expect(screen.queryByRole('region',{name:'Staged subtitle review'})).toBeNull()
 expect((api.installPublishedSubtitleStage as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
})

it('does not redraw an old library after a delayed post-install inventory refresh',async()=>{
 let finishOldRefresh:((value:unknown)=>void)|undefined
 const pendingOldRefresh=new Promise<unknown>(resolve=>{finishOldRefresh=resolve})
 const oldPart={partId:'old-part',fileName:'Old.mkv',review:{
  existing:[],existingAudits:[],candidates:[{id:'local-srt',name:'Old.en.srt',language:'en',bytes:20,
   audit:{status:'ready',cues:1,sha256:'b'.repeat(64),ocr:[],warnings:[]}}],coverage:'missing'},
  decision:{disposition:'active',reason:''},nextAction:'review_local_candidate',embedded:[]}
 let oldOverviewCalls=0
 const api={
  subtitleOverview:vi.fn((libraryId:string)=>{
   if(libraryId==='new')return Promise.resolve({items:[],total:0,limit:25,offset:0})
   oldOverviewCalls++
   return oldOverviewCalls===1?Promise.resolve({items:[oldPart],total:1,limit:25,offset:0}):pendingOldRefresh
  }),
  reviewSubtitles:vi.fn(async()=>oldPart),
  installSubtitle:vi.fn(async()=>({destination:'Old.en.srt',sha256:'b'.repeat(64),bytes:20,source:'local'}))
 } as unknown as ApiClient
 const {rerender}=render(<SubtitleTools api={api} libraryId="old"/>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Review'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Install verified sidecar'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Install verified sidecar'}))
 await waitFor(()=>expect((api.subtitleOverview as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2))
 rerender(<SubtitleTools api={api} libraryId="new"/>)
 await waitFor(()=>expect(screen.getByText(/0 indexed media parts/)).toBeTruthy())
 await act(async()=>{finishOldRefresh?.({items:[oldPart],total:1,limit:25,offset:0})})
 expect(screen.getByText(/0 indexed media parts/)).toBeTruthy()
 expect(screen.queryByRole('button',{name:'Install verified sidecar'})).toBeNull()
})

it('discards a delayed part inspection after the library changes',async()=>{
 let resolveInspect:((value:unknown)=>void)|undefined
 const pendingInspect=new Promise<unknown>(resolve=>{resolveInspect=resolve})
 const oldPart={partId:'old-part',fileName:'Old.mkv',review:{existing:[],existingAudits:[],candidates:[],coverage:'missing'},
  decision:{disposition:'active',reason:''},nextAction:'search_published',embedded:[]}
 const api={
  subtitleOverview:vi.fn(async(libraryId:string)=>({items:libraryId==='old'?[oldPart]:[],total:libraryId==='old'?1:0,limit:25,offset:0})),
  reviewSubtitles:vi.fn(()=>pendingInspect)
 } as unknown as ApiClient
 const {rerender}=render(<SubtitleTools api={api} libraryId="old"/>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Review'}))
 await waitFor(()=>expect((api.reviewSubtitles as ReturnType<typeof vi.fn>)).toHaveBeenCalled())
 rerender(<SubtitleTools api={api} libraryId="new"/>)
 await waitFor(()=>expect(screen.getByText(/0 indexed media parts/)).toBeTruthy())
 await act(async()=>{resolveInspect?.(oldPart)})
 expect(screen.queryByRole('heading',{name:'Old.mkv'})).toBeNull()
 expect(screen.queryByRole('status')).toBeNull()
})

it('discards an old recovery queue response after the library changes',async()=>{
 let resolveQueue:((value:unknown)=>void)|undefined
 const pendingQueue=new Promise<unknown>(resolve=>{resolveQueue=resolve})
 const api={
  subtitleOverview:vi.fn(async()=>({items:[],total:0,limit:25,offset:0})),
  refreshSubtitleQueue:vi.fn(()=>pendingQueue)
 } as unknown as ApiClient
 const {rerender}=render(<SubtitleTools api={api} libraryId="old"/>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'Inspect current page into recovery queue'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Inspect current page into recovery queue'}))
 await waitFor(()=>expect((api.refreshSubtitleQueue as ReturnType<typeof vi.fn>)).toHaveBeenCalled())
 rerender(<SubtitleTools api={api} libraryId="new"/>)
 await waitFor(()=>expect(screen.getByText(/0 indexed media parts/)).toBeTruthy())
 await act(async()=>{resolveQueue?.({items:[],planned:17,total:17,limit:25,offset:0})})
 expect(screen.queryByRole('region',{name:'Subtitle recovery queue'})).toBeNull()
 expect(screen.queryByRole('status')).toBeNull()
})
