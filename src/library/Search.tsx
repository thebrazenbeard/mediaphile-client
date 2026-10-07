import{useState}from 'react'
import{useCatalog}from './useCatalog'
import{PosterCard}from './components/PosterCard'
export function Search(){
 const[q,setQ]=useState('')
 const{items,loading,error}=useCatalog({q:q.trim()||undefined,limit:200})
 return <section><div className="page-heading"><span className="eyebrow">FIND YOUR NEXT WATCH</span><h1>Search</h1><p>Search across movies, shows, seasons and episodes.</p></div>
 <label className="search-label">Search your library<input type="search" data-focusable autoFocus placeholder="Movie, show or episode title…" value={q} onChange={e=>setQ(e.target.value)}/></label>
 {error&&<p role="alert">{error}</p>}{loading?<p className="muted">Searching…</p>:<div className="poster-grid">{items.filter(i=>i.kind==='movie'||i.kind==='show'||i.kind==='episode').map(item=><PosterCard key={item.id} item={item}/>)}</div>}
 </section>
}
