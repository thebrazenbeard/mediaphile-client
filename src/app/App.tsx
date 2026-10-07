import {useEffect,useState} from 'react'
import {ApiClient} from '../api/client'
import type{ServerInfo,User}from '../api/types'
import {AuthProvider}from '../auth/AuthProvider'
import {Login}from '../auth/Login'
import {Bootstrap}from '../auth/Bootstrap'
import {ServerConnect}from '../discovery/ServerConnect'
import {AppShell}from './AppShell'

type Connection='loading'|'online'|'offline'|'incompatible'
export function App(){
  const [api,setApi]=useState(()=>new ApiClient(window.location.origin))
  const [server,setServer]=useState<ServerInfo|null>(null)
  const [connection,setConnection]=useState<Connection>('loading')
  const [user,setUser]=useState<User|null>(null)
  useEffect(()=>{
    let active=true
    setConnection('loading')
    api.serverInfo().then(info=>{
      if(!active)return
      if(!info.apiVersions.includes('v1'))setConnection('incompatible')
      else {setServer(info);setConnection('online')}
    }).catch(()=>{if(active)setConnection('offline')})
    return ()=>{active=false}
  },[api])
  useEffect(()=>{
    api.onUnauthorized=()=>setUser(null)
    return ()=>{api.onUnauthorized=undefined}
  },[api])
  function signedIn(token:string,nextUser:User){api.setToken(token);setUser(nextUser);setServer(s=>s?{...s,initialized:true}:s)}
  function onConnect(next:ApiClient){setApi(next);setUser(null)}
  async function logout(){try{await api.logout()}finally{setUser(null)}}
  if(connection==='loading')return <div className="startup"><div className="brandmark">M</div><p>Connecting to your library…</p></div>
  if(connection==='incompatible')return <div className="startup"><div className="brandmark">M</div><h2>Server version not supported.</h2><button onClick={()=>setConnection('offline')}>Choose another server</button></div>
  if(connection==='offline')return <main className="auth-page"><div className="brand-hero"><div className="brandmark">M</div><span>MEDIAPHILE</span><h2>Every story. All yours.</h2><p>Your own collection, without a cloud between you and what you love.</p></div><ServerConnect onConnect={onConnect}/></main>
  if(!server)return null
  if(!user)return <main className="auth-page"><div className="brand-hero"><div className="brandmark">M</div><span>MEDIAPHILE</span><h2>Every story. All yours.</h2><p>Your own collection, without a cloud between you and what you love.</p></div>{server.initialized?<Login api={api} onSuccess={signedIn}/>:<Bootstrap api={api} onSuccess={signedIn}/>}</main>
  return <AuthProvider value={{api,user,onLogout:logout}}><AppShell server={server}/></AuthProvider>
}
