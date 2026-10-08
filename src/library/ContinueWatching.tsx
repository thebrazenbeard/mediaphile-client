import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../auth/AuthProvider'
import type {ContinueWatchingEntry} from '../api/types'

function formatPosition(ms:number){
 const total=Math.floor(Math.max(ms,0)/1000)
 const minutes=Math.floor(total/60)
 return minutes+':'+String(total%60).padStart(2,'0')
}

export function ContinueWatching(){
 const {api}=useAuth()
 const [entries,setEntries]=useState<ContinueWatchingEntry[]>([])
 useEffect(()=>{
  let active=true
  api.continueWatching(12).then(result=>{if(active)setEntries(result.items)}).catch(()=>{
   if(active)setEntries([])
  })
  return ()=>{active=false}
 },[api])
 if(!entries.length)return null
 return <section className="media-section" aria-label="Continue Watching">
  <div className="section-heading"><div><h2>Continue Watching</h2><p>Pick up where you left off.</p></div></div>
  <div className="media-row">
   {entries.map(({item,resumeMs})=><Link key={item.id} to={'/play/'+encodeURIComponent(item.id)}
     data-focusable className="poster-card resume-card" aria-label={'Resume '+item.title}>
     <div className="poster-art poster-emerald"><div className="poster-graphic" aria-hidden="true">▶</div></div>
     <div className="poster-name">{item.title}</div>
     <div className="poster-meta">Resume at <span>{formatPosition(resumeMs)}</span></div>
    </Link>)}
  </div>
 </section>
}
