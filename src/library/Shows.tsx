import{useCatalog}from './useCatalog'
import{PosterCard}from './components/PosterCard'
export function Shows(){
 const{items,loading,error}=useCatalog({kind:'show',limit:200})
 return <section><div className="page-heading"><span className="eyebrow">YOUR COLLECTION</span><h1>TV Shows<span className="heading-count">{items.length}</span></h1><p>Entire worlds. Episode by episode.</p></div>
 {error&&<p role="alert">{error}</p>}{loading?<p className="muted">Loading TV shows…</p>:items.length?<div className="poster-grid">{items.map(item=><PosterCard key={item.id} item={item}/>)}</div>:<div className="empty-state"><strong>No shows indexed yet.</strong><p>Configure and scan a TV library in Settings.</p></div>}
 </section>
}
