import {useEffect,useRef,useState,type ChangeEvent} from 'react'
import type {ApiClient} from '../api/client'
import type {SubtitleOverview,SubtitlePart,SubtitleDecision,SubtitleQueuePage,PublishedSubtitleSearchReply,PublishedSubtitleStageReply,PublishedSubtitleStageReview} from '../api/types'

export function SubtitleTools({api,libraryId}:{api:ApiClient;libraryId:string}){
 const[page,setPage]=useState<SubtitleOverview|null>(null)
 const[queue,setQueue]=useState<SubtitleQueuePage|null>(null)
 const[selected,setSelected]=useState<SubtitlePart|null>(null)
 const[offset,setOffset]=useState(0)
 const[busy,setBusy]=useState(false)
 const[error,setError]=useState('')
 const[notice,setNotice]=useState('')
 const[reason,setReason]=useState('')
 const[searchText,setSearchText]=useState('')
 const[published,setPublished]=useState<PublishedSubtitleSearchReply|null>(null)
 const[staged,setStaged]=useState<PublishedSubtitleStageReply|null>(null)
 const[preview,setPreview]=useState<PublishedSubtitleStageReview|null>(null)
 const[reviewConfirmed,setReviewConfirmed]=useState(false)
 const scopeEpoch=useRef(0)

 useEffect(()=>{
  let active=true
  scopeEpoch.current++
  setPage(null);setSelected(null);setQueue(null);setPublished(null);setStaged(null);setPreview(null);setReviewConfirmed(false);setError('');setNotice('');setBusy(false)
  api.subtitleOverview(libraryId,offset).then(r=>{if(active)setPage(r)}).catch(e=>{if(active)setError(String(e))})
  return()=>{active=false}
 },[api,libraryId,offset])

 async function refresh(partId?:string){
  const epoch=scopeEpoch.current
  const next=await api.subtitleOverview(libraryId,offset)
  if(epoch!==scopeEpoch.current)return
  setPage(next)
  if(partId){
   const inspected=await api.reviewSubtitles(partId)
   if(epoch!==scopeEpoch.current)return
   setSelected(inspected)
   setReason(inspected.decision?.reason??'')
   setSearchText(inspected.fileName.replace(/\.[^.]+$/,''))
   setPublished(null);setStaged(null);setPreview(null);setReviewConfirmed(false)
  }
 }
 async function refreshQueue(){
  const epoch=scopeEpoch.current
  setBusy(true);setError('');setNotice('')
  try {
   const result=await api.refreshSubtitleQueue(libraryId,25,offset)
   if(epoch!==scopeEpoch.current)return
   setQueue(result)
   setNotice('Inspected '+result.planned+' indexed videos. Queue results are saved; no media was modified.')
  }catch(e){if(epoch===scopeEpoch.current)setError(String(e))}finally{if(epoch===scopeEpoch.current)setBusy(false)}
 }
 async function inspect(partId:string){
  const epoch=scopeEpoch.current
  setBusy(true);setError('');setNotice('')
  try {
   const inspected=await api.reviewSubtitles(partId)
   if(epoch!==scopeEpoch.current)return
   setSelected(inspected);setReason(inspected.decision?.reason??'')
   setSearchText(inspected.fileName.replace(/\.[^.]+$/,''));setPublished(null);setStaged(null);setPreview(null);setReviewConfirmed(false)
  }catch(e){if(epoch===scopeEpoch.current)setError(String(e))}finally{if(epoch===scopeEpoch.current)setBusy(false)}
 }
 async function searchPublished(){
  if(!selected || selected.decision?.disposition==='skip'||selected.decision?.disposition==='review')return
  const epoch=scopeEpoch.current
  setBusy(true);setError('');setNotice('');setPublished(null);setStaged(null);setPreview(null);setReviewConfirmed(false)
  try {
   const result=await api.searchPublishedSubtitles(selected.partId,searchText.trim())
   if(epoch!==scopeEpoch.current)return
   setPublished(result)
   setNotice('Search returned '+result.candidates.length+' published subtitle candidates. No files downloaded or installed.')
  }catch(e){if(epoch===scopeEpoch.current)setError(String(e))}finally{if(epoch===scopeEpoch.current)setBusy(false)}
 }
 async function stagePublished(fileId:number){
  if(!selected || (selected.decision?.disposition??'active')!=='active')return
  const epoch=scopeEpoch.current,partId=selected.partId
  setBusy(true);setError('');setNotice('');setStaged(null);setPreview(null);setReviewConfirmed(false)
  try{
   const result=await api.stagePublishedSubtitle(partId,fileId)
   if(epoch!==scopeEpoch.current)return
   if(result.partId!==partId||!/^([0-9a-f]{32})$/.test(result.stage.stageId)||
      !/^[0-9a-f]{64}$/.test(result.stage.sha256))throw new Error('Server returned an invalid staged subtitle identity.')
   setStaged(result)
   setNotice('Subtitle downloaded into review staging. No media sidecar was installed.')
  }catch(e){if(epoch===scopeEpoch.current)setError(String(e))}finally{if(epoch===scopeEpoch.current)setBusy(false)}
 }
 async function previewPublishedStage(){
  if(!selected||!staged)return
  const epoch=scopeEpoch.current,partId=selected.partId,stageId=staged.stage.stageId,expectedSha=staged.stage.sha256
  setBusy(true);setError('');setNotice('');setPreview(null);setReviewConfirmed(false)
  try{
   const result=await api.reviewPublishedSubtitleStage(partId,stageId)
   if(epoch!==scopeEpoch.current)return
   if(result.partId!==partId||result.stageId!==stageId||result.sha256!==expectedSha||
      result.audit.sha256!==expectedSha||result.published){
    throw new Error('Staged subtitle changed since staging. Download and review the candidate again.')
   }
   setPreview(result)
   setNotice('Review the complete staged subtitle against the media before confirming installation. No sidecar has been installed.')
  }catch(e){if(epoch===scopeEpoch.current)setError(e instanceof Error?e.message:String(e))}finally{if(epoch===scopeEpoch.current)setBusy(false)}
 }
 async function installPublishedStage(){
  if(!selected||!staged||!preview||!reviewConfirmed||!staged.stage.readyForReview||
     !preview.readyForReview||preview.audit.status!=='ready'||
     preview.partId!==selected.partId||preview.stageId!==staged.stage.stageId||
     preview.sha256!==staged.stage.sha256)return
  const epoch=scopeEpoch.current,partId=selected.partId,stageId=preview.stageId,sha=preview.sha256
  setBusy(true);setError('');setNotice('')
  try{
   const result=await api.installPublishedSubtitleStage(partId,stageId,sha)
   if(epoch!==scopeEpoch.current)return
   setQueue(null);setPreview(null);setReviewConfirmed(false);setStaged(null)
   try{await refresh(partId)}catch{
    if(epoch===scopeEpoch.current)setError('Installation was accepted, but the media inventory could not be refreshed. Inspect coverage before taking another action.')
   }
   if(epoch!==scopeEpoch.current)return
   setNotice((result.alreadyInstalled?'Reviewed subtitle was already installed':'Installed reviewed subtitle')+', SHA-256 '+result.sha256)
  }catch(e){if(epoch===scopeEpoch.current)setError(e instanceof Error?e.message:String(e))}finally{if(epoch===scopeEpoch.current)setBusy(false)}
 }
 async function install(candidateId:string){
  if(!selected)return
  setBusy(true);setError('')
  try {
   const result=await api.installSubtitle(selected.partId,candidateId)
   setNotice('Installed new sidecar, SHA-256 '+result.sha256)
   setQueue(null)
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
   setQueue(null)
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
   setQueue(null)
   await refresh(selected?.partId)
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{
   e.target.value='';setBusy(false)
  }
 }

 return <section className="settings-panel" aria-label="Subtitle manager">
  <h3>Subtitle Manager</h3>
  <p>Reviews English sidecars, local candidates, and embedded subtitles. Decisions survive server restarts. Skipping never counts as coverage or deletes media. Provider lookups and individual review-staging downloads require explicit actions and server credentials; automatic processing and ASR remain disabled.</p>
  <label>Import previously approved exclusions (JSON)
   <input aria-label="Import subtitle exclusions JSON" type="file" accept=".json,application/json" disabled={busy} onChange={e=>void importManifest(e)}/>
  </label>
  {!page&&!error&&<p>Checking indexed media…</p>}
  <div className="settings-form">
   <button className="outline" disabled={busy||!page} onClick={()=>void refreshQueue()}>
    Inspect current page into recovery queue
   </button>
  </div>
  {queue&&<div role="region" aria-label="Subtitle recovery queue">
   <p>Recovery queue: {queue.planned} inspected on this page, {queue.total} indexed media parts in the library. This is planning only; no downloads or file changes.</p>
   {queue.items.map(item=><div className="library-setting" key={item.partId}>
     <div><strong>{item.fileName}</strong><small>{item.action} · {item.coverage} · {item.disposition} · {item.candidateCount} local candidates</small></div>
     <button className="outline" disabled={busy} onClick={()=>void inspect(item.partId)}>Inspect</button>
   </div>)}
  </div>}
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
   <div className="settings-panel">
    <h4>Published English subtitles (manual lookup)</h4>
    <p>Searching sends the title—not the video or its full NAS path—to OpenSubtitles. Each selected download may consume provider quota. Downloads go to private review staging, then require a separate preview and explicit human confirmation before installation. Server credentials must be configured separately.</p>
    <label>Published subtitle search title
     <input aria-label="Published subtitle search title" type="text" maxLength={180} value={searchText} onChange={e=>setSearchText(e.target.value)}/>
    </label>
    <button className="outline" disabled={busy||!searchText.trim()||(selected.decision?.disposition??'active')!=='active'}
      onClick={()=>void searchPublished()}>Search published English subtitles</button>
    {published&&<div role="region" aria-label="Published subtitle candidates">
      <p>{published.candidates.length} candidates ? metadata only ? nothing downloaded or installed.</p>
      {published.candidates.map(x=><div key={x.fileId}>
       <p>{x.release || x.fileName} · {x.language} · {x.trusted?'trusted source':'unverified source'} · file ID {x.fileId}</p>
       <button className="outline" disabled={busy||(selected.decision?.disposition??'active')!=='active'}
        onClick={()=>void stagePublished(x.fileId)}>Download file {x.fileId} to review staging</button>
      </div>)}
    </div>}
    {staged&&<div role="region" aria-label="Staged subtitle review">
     <p>Unverified subtitle staged for review, not installed: file ID {staged.stage.fileId}, {staged.stage.audit.cues} cues, audit {staged.stage.audit.status}.</p>
     <p>SHA-256: {staged.stage.sha256}. OCR flags: {staged.stage.audit.ocr.length}; timing warnings: {staged.stage.audit.warnings.length}.</p>
     <p>Review release identity, audio synchronization and dialogue before any separate installation step.</p>
     <button className="outline" disabled={busy} onClick={()=>void previewPublishedStage()}>Preview staged subtitle for manual review</button>
     {preview&&<div role="region" aria-label="Staged subtitle text preview">
      <p>Review dialogue against the media. A structural audit alone cannot verify the correct release or synchronization.</p>
      <pre style={{whiteSpace:'pre-wrap',maxHeight:'20rem',overflow:'auto'}}>{preview.text}</pre>
      {preview.readyForReview&&preview.audit.status==='ready'?<>
       <label><input type="checkbox" checked={reviewConfirmed} disabled={busy}
        onChange={e=>setReviewConfirmed(e.target.checked)}/>
        I reviewed the release, dialogue, and timing against the media
       </label>
       <button className="outline" disabled={busy||!reviewConfirmed}
        onClick={()=>void installPublishedStage()}>Install reviewed staged subtitle</button>
      </>:<p>Structural review is unresolved. Installation is blocked.</p>}
     </div>}
    </div>}
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
