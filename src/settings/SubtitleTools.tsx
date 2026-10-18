import {useEffect,useState} from 'react'
import type {ApiClient} from '../api/client'
import type {SubtitleOverview,SubtitlePart} from '../api/types'

export function SubtitleTools({api,libraryId}:{api:ApiClient;libraryId:string}){
 const[page,setPage]=useState<SubtitleOverview|null>(null)
 const[selected,setSelected]=useState<SubtitlePart|null>(null)
 const[offset,setOffset]=useState(0)
 const[busy,setBusy]=useState(false)
 const[error,setError]=useState('')
 const[notice,setNotice]=useState('')
 useEffect(()=>{
  let active=true
  setError('')
  api.subtitleOverview(libraryId,offset).then(result=>{if(active)setPage(result)}).catch(e=>{if(active)setError(String(e))})
  return()=>{active=false}
 },[api,libraryId,offset])
 async function inspect(partId:string){
  setBusy(true);setError('');setNotice('')
  try{setSelected(await api.reviewSubtitles(partId))}
  catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function install(candidateId:string){
  if(!selected)return
  setBusy(true);setError('')
  try{
   const result=await api.installSubtitle(selected.partId,candidateId)
   setNotice('Installed new sidecar, SHA-256 '+result.sha256)
   setSelected(await api.reviewSubtitles(selected.partId))
   setPage(await api.subtitleOverview(libraryId,offset))
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 return <section className="settings-panel" aria-label="Subtitle review">
  <h3>Subtitle discovery and OCR review</h3>
  <p>Checks English sidecars, local Subtitles/Subs folders, and embedded subtitle text on inspection. Nothing is corrected or installed automatically. Online subtitle-provider search is not configured.</p>
  {!page&&!error&&<p>Checking indexed media…</p>}
  {page&&<><p>{page.total} indexed media parts · showing {page.items.length} from offset {offset}</p>
   {page.items.map(item=><div className="library-setting" key={item.partId}>
    <div><strong>{item.fileName}</strong><small>{item.review.coverage} · {item.review.candidates.length} local candidates</small></div>
    <button className="outline" data-focusable disabled={busy} onClick={()=>void inspect(item.partId)}>Review</button>
   </div>)}
   <div className="settings-form"><button className="outline" disabled={offset===0||busy} onClick={()=>setOffset(Math.max(0,offset-25))}>Previous</button><button className="outline" disabled={offset+page.limit>=page.total||busy} onClick={()=>setOffset(offset+page.limit)}>Next</button></div>
  </>}
  {selected&&<div className="settings-panel"><h3>{selected.fileName}</h3>
   <p>Coverage: {selected.review.coverage} · existing sidecars: {selected.review.existing.join(', ')||'none'}</p>
   {selected.review.existingAudits.map(e=><p key={e.name}>Existing {e.name} ({e.language}): {e.status}. {e.audit?e.audit.ocr.length+' possible OCR errors':''} {e.reason}</p>)}
   {selected.embedded.map(e=><p key={e.index}>Embedded stream {e.index} ({e.codec}): {e.status}. {e.audit?e.audit.ocr.length+' possible OCR errors':''} {e.reason}</p>)}
   {selected.review.candidates.length===0&&<p>No matching local English SRT candidates found.</p>}
   {selected.review.candidates.map(candidate=><div key={candidate.id}>
    <p>{candidate.name}: {candidate.audit.status}, {candidate.audit.cues} cues, {candidate.audit.ocr.length} OCR findings, {candidate.audit.warnings.length} timing warnings.</p>
    {candidate.audit.status==='ready'&&<button className="outline" disabled={busy} onClick={()=>void install(candidate.id)}>Install verified sidecar</button>}
   </div>)}
  </div>}
  {notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert">{error}</p>}
 </section>
}
