import{Link}from 'react-router-dom'
import{useCatalog}from './useCatalog'
import{MediaRow}from './components/MediaRow'
export function Home(){
 const {items,loading,error}=useCatalog({limit:150})
 const movies=items.filter(i=>i.kind==='movie')
 const shows=items.filter(i=>i.kind==='show')
 return <div className="home-page"><div className="hero"><div className="hero-inner"><span className="hero-tag">YOUR LIBRARY. YOUR RULES.</span><h1>All your stories.<br/><em>In one place.</em></h1><p>Your personal media collection, ready whenever you are. No subscriptions. No cloud. Just play.</p><div className="hero-actions"><Link data-focusable className="primary" to="/movies">Explore Movies ↗</Link><Link data-focusable className="outline" to="/tv">Browse TV Shows</Link></div></div><div className="hero-monogram">M</div></div>
 {error&&<div role="alert" className="form-error">{error}</div>}
 {loading&&<p className="muted">Loading your library…</p>}
 {!loading&&!error&&items.length===0&&<div className="empty-state"><strong>Your library is ready for its first scan.</strong><p>Add a media folder in Settings to start filling your collection.</p><Link className="primary" to="/settings" data-focusable>Set up a library →</Link></div>}
 <MediaRow title="Your Movies" description="The big screen collection" items={movies.slice(0,18)}/>
 <MediaRow title="Television" description="Every season, every episode" items={shows.slice(0,18)}/>
 </div>
}
