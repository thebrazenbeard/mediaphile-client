import{useEffect,useRef,useState}from 'react'
import{Link,useNavigate,useParams}from 'react-router-dom'
import{useAuth}from '../auth/AuthProvider'
import type{ItemDetail,PlaybackDecision,PlaybackSession,PlaybackState}from '../api/types'
import{clientCapabilities}from './capabilities'

export function Player(){
 const{id}=useParams(),navigate=useNavigate(),{api}=useAuth()
 const[detail,setDetail]=useState<ItemDetail|null>(null)
 const[decision,setDecision]=useState<PlaybackDecision|null>(null)
 const[session,setSession]=useState<PlaybackSession|null>(null)
 const[resume,setResume]=useState(0)
 const[error,setError]=useState('')
 const[loading,setLoading]=useState(true)
 const video=useRef<HTMLVideoElement>(null)
 const lastReport=useRef(0)
 useEffect(()=>{
  if(!id)return
  let active=true;setLoading(true);setError('');setSession(null);setDecision(null)
  async function start(){
   try{
    const info=await api.item(id!)
    const previous:PlaybackState|null=await api.playbackState(id!).catch(()=>null)
    const caps=clientCapabilities()
    const next=await api.decide(id!,caps)
    if(!active)return
    setDetail(info);setResume(previous?.resumeMs??0);setDecision(next)
    if(next.mode==='UNPLAYABLE'){setError(next.reasons.join(', ')||'This media cannot be played on this device');return}
    if(!next.sourceId)throw new Error('No playable media source returned')
    const result=await api.createSession(id!,caps.clientId,next.sourceId,next.mode,next.reasons)
    if(active)setSession(result)
    else void api.endSession(result.id,'navigation')
   }catch(e){if(active)setError(e instanceof Error?e.message:'Could not start playback')}
   finally{if(active)setLoading(false)}
  }
  void start()
  return()=>{active=false}
 },[api,id])
 const playbackURL=decision?.url?api.url(decision.url.replace('{sessionId}',session?.id??'')):''
 useEffect(()=>{
  if(!session||!playbackURL||!video.current)return
  const element=video.current
  if(decision?.mode==='DIRECT_PLAY'){element.src=playbackURL;return}
  if(element.canPlayType('application/vnd.apple.mpegurl')){element.src=playbackURL;return}
  let destroyed=false
  let destroy=()=>{}
  import('hls.js').then(({default:Hls})=>{
   if(destroyed)return
   if(!Hls.isSupported()){setError('HLS playback is not supported by this browser');return}
   const hls=new Hls({enableWorker:true});hls.loadSource(playbackURL);hls.attachMedia(element)
   destroy=()=>hls.destroy()
  }).catch(()=>{if(!destroyed)setError('Could not initialize HLS')})
  return()=>{destroyed=true;destroy();element.removeAttribute('src');element.load()}
 },[playbackURL,decision?.mode,session])
 useEffect(()=>{
  if(!session)return
  const sessionID=session.id
  return()=>{void api.endSession(sessionID,'navigation').catch(()=>{})}
 },[api,session?.id])
 function report(state:string){
  if(!session||!video.current)return
  void api.updateSession(session.id,Math.round(video.current.currentTime*1000),state).catch(()=>{})
 }
 function update(){
  if(Date.now()-lastReport.current>=15000){lastReport.current=Date.now();report('playing')}
 }
 function loaded(){if(video.current&&resume>0){video.current.currentTime=resume/1000}}
 async function stop(){if(session)await api.endSession(session.id,'user_stop').catch(()=>{});navigate(-1)}
 return <div className="player-page"><div className="player-top"><button className="back-link" data-focusable onClick={()=>void stop()}>← EXIT PLAYER</button><div><span className="eyebrow">NOW PLAYING</span><h2>{detail?.item.title??'Loading…'}</h2></div><span className="server-badge">{decision?.mode?.replaceAll('_',' ')??'PREPARING'}</span></div>
 {loading&&<div className="player-placeholder">Preparing your media…</div>}
 {error&&<div className="empty-state" role="alert"><strong>Playback unavailable</strong><p>{error}</p><Link data-focusable to="/movies" className="outline">Return to library</Link></div>}
 {!loading&&!error&&session&&decision&&<div className="player-frame"><video ref={video} controls playsInline autoPlay onLoadedMetadata={loaded} onTimeUpdate={update} onPause={()=>report('paused')} onPlay={()=>report('resumed')} onEnded={()=>{report('ended');void stop()}} aria-label={'Playing '+(detail?.item.title??'media')}/>
 <div className="player-footer"><span>{detail?.item.title}</span><span>{decision.mode} · {decision.reasons.join(', ')||'Compatible with this client'}</span></div></div>}
 </div>
}
