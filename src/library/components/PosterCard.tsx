import {Link}from 'react-router-dom'
import type{Item}from '../../api/types'
const gradients=['poster-amber','poster-cyan','poster-purple','poster-emerald','poster-rose']
function hash(s:string){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)}
export function PosterCard({item}:{item:Item}){
 const initials=item.title.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('')
 return <Link to={'/item/'+encodeURIComponent(item.id)} data-focusable="true" className="poster-card" aria-label={'Open '+item.title}>
  <div className={'poster-art '+gradients[hash(item.id)%gradients.length]}><div className="poster-graphic">{initials}</div><span className="poster-kind">{item.kind==='show'?'SERIES':item.kind==='episode'?'EPISODE':'FILM'}</span></div>
  <div className="poster-name">{item.title}</div><div className="poster-meta">{item.year??(item.kind==='show'?'TV Series':'Local Media')}{item.unresolved?' · Unmatched':''}</div>
 </Link>
}
