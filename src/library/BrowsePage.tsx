import {useEffect,useState} from 'react'
import type {Item,Library} from '../api/types'
import {useAuth} from '../auth/AuthProvider'
import {useCatalog,type WatchState} from './useCatalog'
import {PosterCard} from './components/PosterCard'

type BrowseKind='movie'|'show'
type ViewMode='grid'|'list'

function preference(key:string, fallback:string):string {
 try{return localStorage.getItem(key)??fallback}catch{return fallback}
}
function savePreference(key:string,value:string){
 try{localStorage.setItem(key,value)}catch{/* local storage disabled */}
}

export function BrowsePage({kind}:{kind:BrowseKind}){
 const {api}=useAuth()
 const mediaType=kind==='movie'?'movies':'tv'
 const title=kind==='movie'?'Movies':'TV Shows'
 const prefix='mediaphile.browse.'+mediaType+'.'
 const [libraries,setLibraries]=useState<Library[]>([])
 const [librariesError,setLibrariesError]=useState('')
 const [libraryId,setLibraryId]=useState(()=>preference(prefix+'library',''))
 const [watchState,setWatchState]=useState<WatchState>('all')
 const [view,setView]=useState<ViewMode>(()=>preference(prefix+'view','grid')==='list'?'list':'grid')
 const [search,setSearch]=useState('')
 const {items,loading,error,hasMore,loadingMore,loadMore}=useCatalog({kind,libraryId,watchState,q:search.trim()||undefined,limit:24})

 useEffect(()=>{
  const controller=new AbortController()
  api.libraries().then(result=>{if(!controller.signal.aborted)setLibraries(result.libraries.filter(lib=>lib.mediaType===mediaType))})
   .catch(e=>{if(!controller.signal.aborted)setLibrariesError(e instanceof Error?e.message:'Could not load libraries')})
  return ()=>controller.abort()
 },[api,mediaType])

 function chooseLibrary(id:string){setLibraryId(id);savePreference(prefix+'library',id)}
 function chooseView(mode:ViewMode){setView(mode);savePreference(prefix+'view',mode)}

 return <section className="browse-page">
  <div className="page-heading"><span className="eyebrow">YOUR COLLECTION</span><h1>{title}</h1>
   <p>{kind==='movie'?'Browse the stories in your library.':'Find a show and continue episode by episode.'}</p>
  </div>
  <div className="browse-toolbar" aria-label={title+' browse controls'}>
   <label>Library
    <select data-focusable aria-label="Library" value={libraryId} onChange={e=>chooseLibrary(e.target.value)}>
     <option value="">All {title.toLowerCase()} libraries</option>
     {libraries.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
   </label>
   <label>Watch status
    <select data-focusable aria-label="Watch status" value={watchState} onChange={e=>setWatchState(e.target.value as WatchState)}>
     <option value="all">All</option><option value="unplayed">Unplayed</option>
     <option value="in_progress">In Progress</option><option value="watched">Watched</option>
    </select>
   </label>
   <label>Search this library
    <input data-focusable type="search" aria-label="Search this library" value={search} onChange={e=>setSearch(e.target.value)} placeholder={'Search '+title.toLowerCase()}/>
   </label>
   <div className="view-options" role="group" aria-label="Display mode">
    <button data-focusable type="button" aria-label="Grid view" aria-pressed={view==='grid'} className={view==='grid'?'active':''} onClick={()=>chooseView('grid')}>▦</button>
    <button data-focusable type="button" aria-label="List view" aria-pressed={view==='list'} className={view==='list'?'active':''} onClick={()=>chooseView('list')}>☷</button>
   </div>
  </div>
  {librariesError&&<p role="alert" className="form-error">{librariesError}</p>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  {loading?<p className="muted">Loading {title.toLowerCase()}…</p>:
   items.length?<div className={view==='grid'?'poster-grid':'poster-list'} aria-live="polite">
    {items.map((item:Item)=><PosterCard key={item.id} item={item}/>)}
   </div>:<div className="empty-state"><strong>No {title.toLowerCase()} found.</strong>
    <p>Choose another library, clear a filter, or scan a local media folder in Settings.</p>
   </div>}
  {!loading&&hasMore&&<div className="browse-footer">
   <button className="outline" type="button" data-focusable disabled={loadingMore} onClick={()=>void loadMore()}>{loadingMore?'Loading…':'Load more'}</button>
  </div>}
  {!loading&&items.length>0&&<p className="browse-count">{items.length} displayed{hasMore?' · more available':''}</p>}
 </section>
}
