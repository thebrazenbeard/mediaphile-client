export type Direction='ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown'
export type FocusRect={id:string,left:number,top:number,width:number,height:number,hidden?:boolean}
export function nextFocus(items:FocusRect[],currentId:string,direction:Direction):string|null{
 const active=items.filter(r=>!r.hidden&&r.width>0&&r.height>0)
 const current=active.find(r=>r.id===currentId)
 if(!current)return active[0]?.id??null
 const cx=current.left+current.width/2,cy=current.top+current.height/2
 const candidates=active.filter(r=>{
  if(r.id===current.id)return false
  const dx=r.left+r.width/2-cx,dy=r.top+r.height/2-cy
  if(direction==='ArrowRight')return dx>1
  if(direction==='ArrowLeft')return dx< -1
  if(direction==='ArrowDown')return dy>1
  return dy< -1
 })
 candidates.sort((a,b)=>{
  const score=(r:FocusRect)=>{
   const dx=Math.abs(r.left+r.width/2-cx),dy=Math.abs(r.top+r.height/2-cy)
   return (direction==='ArrowLeft'||direction==='ArrowRight')?[dx,dy]:[dy,dx]
  }
  const [am,as]=score(a),[bm,bs]=score(b)
  return am-bm||as-bs||a.id.localeCompare(b.id)
 })
 return candidates[0]?.id??current.id
}
