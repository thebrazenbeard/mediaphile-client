import type{Knowledge}from '../api/types'
const labels:Record<string,string>={filesystem_catalog:'Catalog fact',external_metadata:'External metadata',screenplay_transcript:'Script / transcript',subtitle:'Subtitle evidence',audiovisual_review:'Audiovisual review',derived_analysis:'Interpretive analysis'}
export function evidenceLabel(value:string){return labels[value]??'Unknown evidence class'}
export function ProvenancePanel({records}:{records:Knowledge[]}){
 if(!records.length)return null
 return <section className="knowledge-panel"><h2>Mediaphile Knowledge</h2><p>Source-qualified information; interpretation is never presented as direct evidence.</p>
 {records.map((r,i)=><article className="knowledge-record" key={r.id??i}><div className="knowledge-record-head"><span className="evidence-label">{evidenceLabel(r.evidenceClass)}</span>{r.unresolved&&<span className="warning-label">Unresolved</span>}{r.conflict&&<span className="warning-label">Conflicting</span>}</div>
 <div className="knowledge-body">{Object.entries(r.payload??{}).slice(0,8).map(([k,v])=><div key={k}><strong>{k.replaceAll('_',' ')}</strong>: {typeof v==='string'?v:JSON.stringify(v)}</div>)}</div>
 <small>Source: {r.sourceRepository} · {r.sourceRevision?.slice(0,12)}</small></article>)}
 </section>
}
