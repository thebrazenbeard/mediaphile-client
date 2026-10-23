import {useEffect,useState,type ChangeEvent} from 'react'
import type {ApiClient} from '../api/client'
import type {SubtitleOverview,SubtitlePart,SubtitleDecision} from '../api/types'

export function SubtitleTools({api,libraryId}:{api:ApiClient;libraryId:string}){
 const[page,setPage]=useState<SubtitleOverview|null>(null)
 const[selected,setSelected]=useState<SubtitlePart|null>(null)
 const[offset,setOffset]=useState(0)
 const[busy,setBusy]=useState(false)
 const[error,setError]=useState('')
 const[notice,setNotice]=useState('')
 const[reason,setReason]=useState('')

 useEffect(()=>{
  let active=true
  setPage(null);setSelected(null);setError('')
  api.subtitleOverview(libraryId,offset).then(r=>{if(active)setPage(r)}).catch(e=>{if(active)setError(String(e))})
  return()=>{active=false}
 },[api,libraryId,offset])

 async function refresh(partId?:string){
  const next=await api.subtitleOverview(libraryId,offset)
  setPage(next)
  if(partId){
   const inspected=await api.reviewSubtitles(partId)
   setSelected(inspected)
   setReason(inspected.decision?.reason??'')
  }
 }
 async function inspect(partId:string){
  setBusy(true);setError('');setNotice('')
  try {
   const inspected=await api.reviewSubtitles(partId)
   setSelected(inspected);setReason(inspected.decision?.reason??'')
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function install(candidateId:string){
  if(!selected)return
  setBusy(true);setError('')
  try {
   const result=await api.installSubtitle(selected.partId,candidateId)
   setNotice('Installed new sidecar, SHA-256 '+result.sha256)
   await refresh(selected.partId)
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function decide(disposition:SubtitleDecision['disposition']){
  if(!selected)return
  const rationale=disposition==='active'?'':reason.trim()
  if(disposition!=='active'&&!rationale){setError('Enter a reason before skipping or holding a video.');return}
  setBusy(true);setError('')
  try{
   await api.setSubtitleDecision(selected.partId,disposition,rationale)
   setNotice(disposition==='skip'?'Video excluded from subtitle recovery (not counted as covered).':
     disposition==='review'?'Video placed in manual review.':'Video restored to active subtitle recovery.')
   await refresh(selected.partId)
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function importManifest(e:ChangeEvent<HTMLInputElement>){
  const file=e.currentTarget.files?.[0]
  if(!file)return
  setBusy(true);setError('');setNotice('')
  try{
   const data:unknown=JSON.parse(await file.text())
   if(typeof data!=='object'||data===null||!('exclusions' in data)||!Array.isArray(data.exclusions)){
    throw new Error('Choose an exclusion manifest with an exclusions array.')
   }
   const payload=data as {exclusions:Array<{video:string;reason:string}>}
   const result=await api.importSubtitleExclusions({exclusions:payload.exclusions})
   setNotice('Imported '+result.imported+' new exclusions from '+result.total+' entries. Existing decisions were preserved.')
   await refresh(selected?.partId)
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{
   e.target.value='';setBusy(false)
  }
 }

 return <section className="settings-panel" aria-label="Subtitle manager">
  <h3>Subtitle Manager</h3>
  <p>Reviews English sidecars, local candidates, and embedded subtitles. Decisions survive server restarts. Skipping a video never counts as coverage or deletes media; online search, synchronization, and ASR automation are not enabled in this phase.</p>
  <label>Import previously approved exclusions (JSON)
   <input aria-label="Import subtitle exclusions JSON" type="file" accept=".json,application/json" disabled={busy} onChange={e=>void importManifest(e)}/>
  </label>
  {!page&&!error&&<p>Checking indexed media…</p>}
  {page&&<><p>{page.total} indexed media parts · showing {page.items.length} from offset {offset}</p>
   {page.items.map(item=><div className="library-setting" key={item.partId}>
    <div>
     <strong>{item.fileName}</strong>
     <small>{item.review.coverage} · {item.nextAction??'review'} · {item.decision?.disposition??'active'} · {item.review.candidates.length} local candidates</small>
    </div>
    <button className="outline" data-focusable disabled={busy} onClick={()=>void inspect(item.partId)}>Review</button>
   </div>)}
   <div className="settings-form">
    <button className="outline" disabled={offset===0||busy} onClick={()=>setOffset(Math.max(0,offset-25))}>Previous</button>
    <button className="outline" disabled={offset+page.limit>=page.total||busy} onClick={()=>setOffset(offset+page.limit)}>Next</button>
   </div>
  </>}
  {selected&&<div className="settings-panel">
   <h3>{selected.fileName}</h3>
   <p>Coverage: {selected.review.coverage} · next action: {selected.nextAction??'review'} · decision: {selected.decision?.disposition??'active'}</p>
   <label>Recovery decision reason
    <input aria-label="Recovery decision reason" type="text" maxLength={256} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why skip or hold this video?"/>
   </label>
   <div className="settings-form">
    <button className="outline" disabled={busy} onClick={()=>void decide('skip')}>Skip subtitles</button>
    <button className="outline" disabled={busy} onClick={()=>void decide('review')}>Hold for review</button>
    <button className="outline" disabled={busy} onClick={()=>void decide('active')}>Restore active</button>
   </div>
   <p>Existing sidecars: {selected.review.existing.join(', ')||'none'}</p>
   {selected.review.existingAudits.map(x=><p key={x.name}>Existing {x.name} ({x.language}): {x.status}. {x.audit?x.audit.ocr.length+' possible OCR errors':''} {x.reason}</p>)}
   {selected.embedded.map(x=><p key={x.index}>Embedded stream {x.index} ({x.codec}): {x.status}. {x.audit?x.audit.ocr.length+' possible OCR errors':''} {x.reason}</p>)}
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
