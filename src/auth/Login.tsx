import {useState,type FormEvent} from 'react'
import type{ApiClient}from '../api/client'
import type{User}from '../api/types'
export function Login({api,onSuccess}:{api:ApiClient,onSuccess:(token:string,user:User)=>void}){
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState('')
  const [pending,setPending]=useState(false)
  async function submit(e:FormEvent){e.preventDefault();setPending(true);setError('')
    try{const r=await api.login(username,password);onSuccess(r.token,r.user)}
    catch(err){setError(err instanceof Error?err.message:'Login failed')}
    finally{setPending(false)}
  }
  return <section className="auth-card"><div className="eyebrow">PRIVATE NETWORK · LOCAL ACCOUNT</div><h1>Welcome back.</h1><p>Your media is right where you left it.</p>
    <form onSubmit={submit}><label>Username<input required autoFocus value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username"/></label>
    <label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>
    {error&&<div role="alert" className="form-error">{error}</div>}<button className="primary" disabled={pending}>{pending?'Signing in…':'Enter Mediaphile →'}</button></form></section>
}
