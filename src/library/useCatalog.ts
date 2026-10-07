import {useCallback,useEffect,useRef,useState} from 'react'
import type {Item} from '../api/types'
import {useAuth} from '../auth/AuthProvider'

export type WatchState='all'|'unplayed'|'in_progress'|'watched'
export type CatalogQuery={kind?:Item['kind'],parentId?:string,q?:string,limit?:number,libraryId?:string,watchState?:WatchState}

export function useCatalog(query:CatalogQuery={}){
 const {api}=useAuth()
 const [items,setItems]=useState<Item[]>([])
 const [loading,setLoading]=useState(true)
 const [loadingMore,setLoadingMore]=useState(false)
 const [error,setError]=useState('')
 const [nextCursor,setNextCursor]=useState('')
 const generation=useRef(0)
 const {kind,parentId,q,limit,libraryId,watchState}=query
 const pageSize=limit??100

 useEffect(()=>{
  const controller=new AbortController()
  const generationID=++generation.current
  setItems([]);setNextCursor('');setLoading(true);setLoadingMore(false);setError('')
  api.items({kind,parentId,q,limit:pageSize,libraryId,watchState},controller.signal)
   .then(page=>{if(generation.current===generationID){setItems(page.items);setNextCursor(page.nextCursor??'')}})
   .catch(e=>{if(!controller.signal.aborted&&generation.current===generationID)setError(e instanceof Error?e.message:'Cannot load library')})
   .finally(()=>{if(!controller.signal.aborted&&generation.current===generationID)setLoading(false)})
  return ()=>controller.abort()
 },[api,kind,parentId,q,pageSize,libraryId,watchState])

 const loadMore=useCallback(async()=>{
  if(loading||loadingMore||!nextCursor)return
  const generationID=generation.current
  setLoadingMore(true)
  setError('')
  try {
   const page=await api.items({kind,parentId,q,limit:pageSize,libraryId,watchState,cursor:nextCursor})
   if(generationID!==generation.current)return
   setItems(current=>{
    const seen=new Set(current.map(i=>i.id))
    return [...current,...page.items.filter(i=>!seen.has(i.id))]
   })
   setNextCursor(page.nextCursor??'')
  }catch(e){
   if(generationID===generation.current)setError(e instanceof Error?e.message:'Cannot load more media')
  }finally{
   if(generationID===generation.current)setLoadingMore(false)
  }
 },[api,kind,parentId,q,pageSize,libraryId,watchState,nextCursor,loading,loadingMore])

 return {items,loading,loadingMore,error,hasMore:nextCursor!=='',loadMore}
}
