import type{Item}from '../../api/types'
import {PosterCard}from './PosterCard'
export function MediaRow({title,items,description}:{title:string,items:Item[],description?:string}){
 if(!items.length)return null
 return <section className="media-section"><div className="section-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div><span className="section-count">{items.length} TITLES</span></div><div className="media-row">{items.map(item=><PosterCard key={item.id} item={item}/>)}</div></section>
}
