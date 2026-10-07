import {useEffect,useState}from 'react'
import type{Item}from '../api/types'
import {useAuth}from '../auth/AuthProvider'
export function useCatalog(query:{kind?:Item['kind'],parentId?:string,q?:string,limit?:number}={}){
 const {api}=useAuth()
 const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const kind=query.kind,parentId=query.parentId,q=query.q,limit=query.limit
 useEffect(()=>{
   const controller=new AbortController();setLoading(true);setError('')
   api.items({kind,parentId,q,limit:limit??100},controller.signal)
     .then(result=>setItems(result.items))
     .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Cannot load library')})
     .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
   return ()=>controller.abort()
 },[api,kind,parentId,q,limit])
 return {items,loading,error}
}
