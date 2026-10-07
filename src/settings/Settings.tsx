import {useEffect,useState,type FormEvent}from 'react'
import {useAuth}from '../auth/AuthProvider'
import type{Library}from '../api/types'
export function Settings(){
 const{api,user}=useAuth()
 const[libraries,setLibraries]=useState<Library[]>([]),[name,setName]=useState(''),[rootPath,setRootPath]=useState(''),[kind,setKind]=useState<'movies'|'tv'>('movies'),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const[quality,setQuality]=useState(()=>localStorage.getItem('mediaphile-quality')??'auto')
 useEffect(()=>{api.libraries().then(r=>setLibraries(r.libraries)).catch(e=>setNotice(String(e)))},[api])
 async function create(e:FormEvent){
  e.preventDefault();setBusy(true);setNotice('')
  try{const id='library-'+Date.now().toString(36)
    const lib=await api.createLibrary(id,name,kind,rootPath)
    setLibraries(v=>[...v,lib]);setName('');setRootPath('');setNotice('Library created. Select Scan to index its media.')
  }catch(e){setNotice(e instanceof Error?e.message:'Could not create library')}finally{setBusy(false)}
 }
 async function scan(id:string){setBusy(true);setNotice('Scanning media…')
  try{const r=await api.scanLibrary(id);setNotice('Scan completed: '+JSON.stringify(r))}
  catch(e){setNotice(e instanceof Error?e.message:'Scan failed')}finally{setBusy(false)}
 }
 return <section className="settings-page"><div className="page-heading"><span className="eyebrow">YOUR MEDIAPHILE</span><h1>Settings</h1><p>Manage local media sources and player preferences.</p></div>
 <div className="settings-grid"><section className="settings-panel"><h2>Media Libraries</h2><p>These paths are on the server machine or a share mounted there—not paths from your browser.</p>
 {libraries.length===0&&<p className="muted">No configured libraries.</p>}
 {libraries.map(l=><div className="library-setting" key={l.id}><div><strong>{l.name}</strong><small>{l.mediaType.toUpperCase()} · {l.enabled?'ENABLED':'DISABLED'}</small></div>{user.admin&&<button className="outline" data-focusable disabled={busy} onClick={()=>void scan(l.id)}>↻ Scan</button>}</div>)}
 {user.admin&&<form onSubmit={create} className="settings-form"><h3>Add Library</h3>
 <label>Library name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Family Movies"/></label>
 <label>Media type<select value={kind} onChange={e=>setKind(e.target.value as 'movies'|'tv')}><option value="movies">Movies</option><option value="tv">TV Shows</option></select></label>
 <label>Server media path<input required value={rootPath} onChange={e=>setRootPath(e.target.value)} placeholder="Z:\\Media\\Movies or /media/movies"/></label>
 <button className="primary" data-focusable disabled={busy}>Add local library</button></form>}
 </section><section className="settings-panel"><h2>Playback</h2><p>Direct Play is preferred wherever the browser supports the file.</p><label>Quality preference<select value={quality} onChange={e=>{setQuality(e.target.value);localStorage.setItem('mediaphile-quality',e.target.value)}}><option value="auto">Auto / highest supported</option><option value="1080p">Up to 1080p</option><option value="720p">Up to 720p</option></select></label>
 <div className="privacy-card"><strong>● LAN ONLY</strong><p>No Plex account. No remote relay. Your library remains under your control.</p></div></section></div>
 {notice&&<p role="status" className="notice">{notice}</p>}</section>
}
