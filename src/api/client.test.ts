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
