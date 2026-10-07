import {useState,type FormEvent} from 'react'
import type {ApiClient} from '../api/client'
import type {User} from '../api/types'
export function Bootstrap({api,onSuccess}:{api:ApiClient,onSuccess:(token:string,user:User)=>void}){
  const [secret,setSecret]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false)
  async function submit(e:FormEvent){e.preventDefault();setPending(true);setError('')
    try{const r=await api.bootstrap(secret,username,password);onSuccess(r.token,r.user)}
    catch(err){setError(err instanceof Error?err.message:'Setup failed')}
    finally{setPending(false)}
  }
  return <section className="auth-card"><div className="eyebrow">FIRST RUN · PRIVATE SETUP</div><h1>Make it yours.</h1><p>Your server printed a one-time setup secret in its local console. Use it to create your administrator account.</p>
    <form onSubmit={submit}><label>Setup secret<input autoFocus type="password" required value={secret} onChange={e=>setSecret(e.target.value)}/></label>
    <label>Administrator username<input required value={username} onChange={e=>setUsername(e.target.value)}/></label>
    <label>Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<div role="alert" className="form-error">{error}</div>}<button className="primary" disabled={pending}>{pending?'Creating…':'Create local account →'}</button></form></section>
}
