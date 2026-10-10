import type { Capabilities, Item, ItemDetail, ItemPage, Library, PlaybackDecision, PlaybackSession, PlaybackState, ContinueWatchingPage, ServerInfo, User } from './types'

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); this.name = 'ApiError' }
}

export class ApiClient {
  private token = ''
  onUnauthorized?: () => void
  constructor(public readonly baseURL: string, private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args)) {
    const url = new URL(baseURL)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Mediaphile requires an HTTP(S) server')
  }
  setToken(token: string) { this.token = token }
  getToken() { return this.token }
  clearToken() { this.token = '' }
  url(path: string) {
    const resolved = new URL(path, this.baseURL)
    if (resolved.origin !== new URL(this.baseURL).origin) throw new Error("API request must use selected Mediaphile server origin")
    return resolved.toString()
  }

  async request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    const headers: Record<string,string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (this.token) headers.Authorization = 'Bearer ' + this.token
    let response: Response
    try {
      response = await this.fetcher(this.url(path),{
        method, headers, body: body===undefined ? undefined : JSON.stringify(body),
        signal, credentials: 'same-origin',
      })
    } catch (error) { throw new ApiError('SERVER_UNREACHABLE','Cannot reach Mediaphile Server',0) }
    if (response.status===401 && this.token) {
      this.clearToken()
      this.onUnauthorized?.()
    }
    if (!response.ok) {
      let code = 'HTTP_'+response.status, message = 'Server returned '+response.status
      try {
        const data: {error?: {code?:string,message?:string}} = await response.json()
        code=data.error?.code || code; message=data.error?.message || message
      } catch { /* server returned non-JSON error */ }
      throw new ApiError(code,message,response.status)
    }
    if (response.status===204) return undefined as T
    return await response.json() as T
  }
  serverInfo() { return this.request<ServerInfo>('/api/v1/server') }
  bootstrap(secret:string,username:string,password:string) {
    return this.request<{token:string,user:User}>('/api/v1/setup/bootstrap','POST',{bootstrapSecret:secret,username,password})
  }
  login(username:string,password:string) {
    return this.request<{token:string,user:User}>('/api/v1/auth/login','POST',{username,password})
  }
  async logout(){ try{await this.request<void>('/api/v1/auth/logout','POST',{})}finally{this.clearToken()} }
  libraries(){return this.request<{libraries:Library[]}>('/api/v1/libraries')}
  createLibrary(id:string,name:string,mediaType:'movies'|'tv',rootPath:string){
    return this.request<Library>('/api/v1/libraries','POST',{id,name,mediaType,rootPath})
  }
  scanLibrary(id:string){return this.request<Record<string,number>>('/api/v1/libraries/'+encodeURIComponent(id)+'/scan','POST',{})}
  items(query: {libraryId?:string,kind?:Item['kind'],parentId?:string,q?:string,cursor?:string,limit?:number,watchState?:'all'|'unplayed'|'in_progress'|'watched'} = {}, signal?:AbortSignal) {
    const params = new URLSearchParams()
    for(const [k,v] of Object.entries(query)) if(v!==undefined && v!=='') params.set(k,String(v))
    return this.request<ItemPage>('/api/v1/items'+(params.size?'?'+params.toString():''),'GET',undefined,signal)
  }
  item(id:string){return this.request<ItemDetail>('/api/v1/items/'+encodeURIComponent(id))}
  decide(itemId:string,capabilities:Capabilities,selection:Record<string,string>={}){
    return this.request<PlaybackDecision>('/api/v1/playback/decide','POST',{itemId,capabilities,selection})
  }
  createSession(itemId:string,clientId:string,sourceId:string,decision:string,reasons:string[]=[]) {
    return this.request<PlaybackSession>('/api/v1/playback/sessions','POST',{itemId,clientId,sourceId,decision,reasons})
  }
  updateSession(id:string,positionMs:number,state:string){
    return this.request<PlaybackSession>('/api/v1/playback/sessions/'+encodeURIComponent(id),'PATCH',{positionMs,state})
  }
  endSession(id:string,reason='stopped'){
    return this.request<void>('/api/v1/playback/sessions/'+encodeURIComponent(id)+'?reason='+encodeURIComponent(reason),'DELETE')
  }
  continueWatching(limit=12){return this.request<ContinueWatchingPage>('/api/v1/users/me/continue-watching?limit='+limit)}
  playbackState(itemId:string){return this.request<PlaybackState>('/api/v1/users/me/playback/'+encodeURIComponent(itemId))}
  putPlaybackState(itemId:string,resumeMs:number,completed:boolean){
    return this.request<PlaybackState>('/api/v1/users/me/playback/'+encodeURIComponent(itemId),'PUT',{resumeMs,completed})
  }
}
