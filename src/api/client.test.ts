import { describe,expect,it,vi } from 'vitest'
import { ApiClient, ApiError } from './client'

describe('ApiClient',()=>{
  it('adds bearer header without putting credentials in the URL',async()=>{
    const fn=vi.fn(async()=>new Response(JSON.stringify({libraries:[]}),{status:200,headers:{'Content-Type':'application/json'}}))
    const api=new ApiClient('http://192.168.1.2:8097',fn as typeof fetch)
    api.setToken('secret')
    await api.libraries()
    const [url,opts]=fn.mock.calls[0] as unknown as [string,RequestInit]
    expect(url).toBe('http://192.168.1.2:8097/api/v1/libraries')
    expect(url).not.toContain('secret')
    expect((opts.headers as Record<string,string>).Authorization).toBe('Bearer secret')
  })
  it('clears credentials after 401 and reports stable errors',async()=>{
    const fn=vi.fn(async()=>new Response(JSON.stringify({error:{code:'AUTH_REQUIRED',message:'sign in'}}),{status:401}))
    const api=new ApiClient('http://127.0.0.1:8097',fn as typeof fetch)
    const unauthorized=vi.fn();api.onUnauthorized=unauthorized;api.setToken('old')
    await expect(api.libraries()).rejects.toMatchObject({code:'AUTH_REQUIRED',status:401})
    expect(api.getToken()).toBe('');expect(unauthorized).toHaveBeenCalledOnce()
  })
  it('normalizes unreachable server failures',async()=>{
    const api=new ApiClient('http://127.0.0.1:8097',vi.fn(async()=>{throw new Error('offline')}) as typeof fetch)
    await expect(api.serverInfo()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('Subtitle API',()=>{
 it('uses authenticated local review and installs by opaque candidate ID without source paths',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({items:[],total:0,offset:0,limit:25}),{status:200}))
  const api=new ApiClient('http://127.0.0.1:8097',fetcher as typeof fetch)
  api.setToken('local-session')
  await api.subtitleOverview('lib 1')
  await api.reviewSubtitles('part/1')
  await api.installSubtitle('part/1','opaque-id')
  const calls=fetcher.mock.calls as unknown as [string,RequestInit][]
  expect(calls[0][0]).toContain('/api/v1/libraries/lib%201/subtitles')
  expect(calls[1][0]).toContain('/api/v1/subtitles/parts/part%2F1')
  expect(calls[2][0]).toContain('/api/v1/subtitles/parts/part%2F1/install')
  expect(calls[2][1].method).toBe('POST')
  expect(calls[2][1].body).toBe(JSON.stringify({candidateId:'opaque-id'}))
  expect(JSON.stringify(calls)).not.toContain('C:\\')
 })
})

describe('Subtitle recovery decisions',()=>{
 it('saves explicit skips by opaque media part ID and imports prior exclusions',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({partId:'part 1',disposition:'skip',reason:'intro'}),{status:200}))
  const api=new ApiClient('http://127.0.0.1:8097',fetcher as typeof fetch)
  api.setToken('private')
  await api.setSubtitleDecision('part 1','skip','intro')
  await api.importSubtitleExclusions({exclusions:[{video:'/volume1/TV Shows/Show/Intro.mkv',reason:'approved skip'}]})
  const calls=fetcher.mock.calls as unknown as [string,RequestInit][]
  expect(calls[0][0]).toBe('http://127.0.0.1:8097/api/v1/subtitles/parts/part%201/decision')
  expect(calls[0][1].method).toBe('PUT')
  expect(calls[0][1].body).toBe(JSON.stringify({disposition:'skip',reason:'intro'}))
  expect(calls[1][0]).toMatch(/\/api\/v1\/subtitles\/decisions\/import$/)
  expect(calls[1][1].method).toBe('POST')
  expect((calls[1][1].headers as Record<string,string>).Authorization).toBe('Bearer private')
 })
})

describe('Subtitle batch recovery planner',()=>{
 it('refreshes a bounded page and reads durable queue without writing subtitle media',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({planned:2,items:[],total:2,offset:0,limit:25}),{status:200}))
  const api=new ApiClient('http://127.0.0.1:8097',fetcher as typeof fetch)
  api.setToken('session')
  await api.refreshSubtitleQueue('movies 1',25,0)
  await api.subtitleQueue('movies 1',25,0)
  const calls=fetcher.mock.calls as unknown as [string,RequestInit][]
  expect(calls[0][0]).toContain('/api/v1/libraries/movies%201/subtitles/queue/refresh')
  expect(calls[0][1].method).toBe('POST')
  expect(calls[0][1].body).toBe(JSON.stringify({limit:25,offset:0}))
  expect(calls[1][0]).toContain('/api/v1/libraries/movies%201/subtitles/queue?limit=25&offset=0')
  expect(calls[1][1].method).toBe('GET')
  expect((calls[0][1].headers as Record<string,string>).Authorization).toBe('Bearer session')
 })
})

describe('Explicit published subtitle discovery',()=>{
 it('posts an opted-in title without a provider API key in the browser',async()=>{
  const calls:Array<[string,RequestInit]>=[]
  const fetcher=vi.fn(async(url:string,init?:RequestInit)=>{
   calls.push([url,init??{}])
   return new Response(JSON.stringify({partId:'part',provider:'opensubtitles',candidates:[],downloaded:false,published:false,note:'metadata only'}),{status:200})
  })
  const api=new ApiClient('http://127.0.0.1:8097',fetcher as typeof fetch)
  api.setToken('session-only')
  const result=await api.searchPublishedSubtitles('part','A Film',2024)
  expect(result.downloaded).toBe(false)
  expect(calls).toHaveLength(1)
  expect(calls[0][0]).toContain('/api/v1/subtitles/parts/part/published/search')
  expect(calls[0][1].method).toBe('POST')
  expect(calls[0][1].body).toBe(JSON.stringify({query:'A Film',year:2024}))
  expect(JSON.stringify(calls[0])).not.toContain('Api-Key')
 })
})
