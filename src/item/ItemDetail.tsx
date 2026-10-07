import {useEffect,useState}from 'react'
import {Link,useNavigate,useParams}from 'react-router-dom'
import {useAuth}from '../auth/AuthProvider'
import type{Item,ItemDetail}from '../api/types'
import {PosterCard}from '../library/components/PosterCard'
import {ProvenancePanel}from '../knowledge/ProvenancePanel'

export function ItemDetailPage(){
 const {id}=useParams(),navigate=useNavigate(),{api}=useAuth()
 const [detail,setDetail]=useState<ItemDetail|null>(null),[children,setChildren]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{
  if(!id)return
  let alive=true;setLoading(true);setError('');setDetail(null);setChildren([])
  api.item(id).then(async result=>{
    if(!alive)return
    setDetail(result)
    if(result.item.kind==='show'||result.item.kind==='season'){
      const page=await api.items({parentId:id,limit:200})
      if(alive)setChildren(page.items)
    }
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'Item unavailable')}).finally(()=>{if(alive)setLoading(false)})
  return()=>{alive=false}
 },[api,id])
 if(loading)return <div className="empty-state">Loading details…</div>
 if(error||!detail)return <div className="empty-state"><strong>That title is unavailable.</strong><p role="alert">{error}</p><button data-focusable onClick={()=>navigate(-1)}>Go back</button></div>
 const {item,sources,streams,knowledge}=detail
 const playable=item.kind==='movie'||item.kind==='episode'
 return <article className="detail-page"><button data-focusable className="back-link" onClick={()=>navigate(-1)}>← BACK TO LIBRARY</button>
  <div className="detail-hero"><div className="detail-art"><span>{item.title.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('')}</span></div>
    <div className="detail-content"><span className="eyebrow">{item.kind.toUpperCase()} {item.unresolved?'· UNRESOLVED IDENTITY':'· YOUR LIBRARY'}</span><h1>{item.title}</h1>
      <p className="detail-meta">{item.year??'Year unknown'}{item.seasonNumber!==undefined?' · Season '+item.seasonNumber:''}{item.episodeNumber!==undefined?' · Episode '+item.episodeNumber:''}</p>
      <p className="detail-summary">A title from your personal collection. Additional summaries and credits can be imported from your Mediaphile knowledge sources.</p>
      <div className="detail-actions">{playable&&<Link className="primary" data-focusable to={'/play/'+encodeURIComponent(item.id)}>▶ &nbsp; Play {item.kind==='episode'?'Episode':'Movie'}</Link>}
        <button data-focusable className="outline" onClick={()=>navigate(-1)}>Back to library</button></div>
      {sources.length>0&&<div className="tech-specs"><span>{sources[0].width||'?'} × {sources[0].height||'?'}</span><span>{sources[0].container.toUpperCase()}</span><span>{sources[0].videoCodec||'Video'}</span><span>{streams.filter(s=>s.kind==='audio').length} AUDIO</span></div>}
    </div></div>
  {children.length>0&&<section className="media-section"><div className="section-heading"><h2>{item.kind==='show'?'Seasons':'Episodes'}</h2></div><div className="poster-grid">{children.map(child=><PosterCard key={child.id} item={child}/>)}</div></section>}
  <ProvenancePanel records={knowledge??[]}/></article>
}
