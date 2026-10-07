import{useCatalog}from './useCatalog'
import{PosterCard}from './components/PosterCard'
export function Movies(){
 const{items,loading,error}=useCatalog({kind:'movie',limit:200})
 return <section><div className="page-heading"><span className="eyebrow">YOUR COLLECTION</span><h1>Movies<span className="heading-count">{items.length}</span></h1><p>From familiar favorites to stories you haven't revisited yet.</p></div>
 {error&&<p role="alert">{error}</p>}{loading?<p className="muted">Loading movies…</p>:items.length?<div className="poster-grid">{items.map(item=><PosterCard key={item.id} item={item}/>)}</div>:<div className="empty-state"><strong>No movies indexed yet.</strong><p>Configure and scan a movie library in Settings.</p></div>}
 </section>
}
