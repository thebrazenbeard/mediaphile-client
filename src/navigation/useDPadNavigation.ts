import {useEffect}from 'react'
import {useNavigate}from 'react-router-dom'
import {nextFocus,type Direction}from './focusModel'
export function useDPadNavigation(){
 const navigate=useNavigate()
 useEffect(()=>{
   function keydown(e:KeyboardEvent){
     const target=e.target as HTMLElement|null
     if(target?.matches('input,textarea,select,[contenteditable="true"]'))return
     if(e.key==='Escape'){if(window.location.pathname.startsWith('/play/')||window.location.pathname.startsWith('/item/'))navigate(-1);return}
     if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return
     const elements=Array.from(document.querySelectorAll<HTMLElement>('[data-focusable]'))
     const rects=elements.map((el,i)=>{const r=el.getBoundingClientRect();return{id:String(i),left:r.left,top:r.top,width:r.width,height:r.height,hidden:el.hidden||getComputedStyle(el).visibility==='hidden'}})
     const focused=elements.indexOf(document.activeElement as HTMLElement)
     const id=nextFocus(rects,String(focused),e.key as Direction)
     if(id===null)return
     e.preventDefault()
     const next=elements[Number(id)]
     next?.focus({preventScroll:true});next?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'})
   }
   window.addEventListener('keydown',keydown)
   return()=>window.removeEventListener('keydown',keydown)
 },[navigate])
}
