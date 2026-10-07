import {useState,type FormEvent} from 'react'
import {validateServerURL} from './serverUrl'
import {ApiClient}from '../api/client'
export function ServerConnect({onConnect}:{onConnect:(api:ApiClient)=>void}){
 const [url,setURL]=useState('http://192.168.1.2:8097'),[error,setError]=useState(''),[pending,setPending]=useState(false)
 async function submit(e:FormEvent){e.preventDefault();setPending(true);setError('')
   try{const target=validateServerURL(url);const api=new ApiClient(target);const info=await api.serverInfo()
     if(!info.apiVersions.includes('v1'))throw new Error('This server does not support Mediaphile API V1')
     localStorage.setItem('mediaphile-server',target);onConnect(api)
   }catch(err){setError(err instanceof Error?err.message:'Connection failed')}finally{setPending(false)}
 }
 return <section className="auth-card"><div className="eyebrow">SERVER CONNECTION</div><h1>Find your library.</h1><p>Enter the LAN address of a Mediaphile Server. No account or connection to the Internet is required.</p>
   <form onSubmit={submit}><label>Server address<input value={url} autoFocus onChange={e=>setURL(e.target.value)} required/></label>
   {error&&<div role="alert" className="form-error">{error}</div>}<button className="primary" disabled={pending}>{pending?'Connecting…':'Connect →'}</button></form>
   <p className="muted">A same-origin server is recommended for playback support.</p></section>
}
