import type{Capabilities}from '../api/types'
const supports=(el:HTMLVideoElement,typ:string)=>el.canPlayType(typ)!==''
export function clientCapabilities():Capabilities{
 const video=document.createElement('video')
 const mp4=supports(video,'video/mp4; codecs="avc1.42E01E, mp4a.40.2"')
 const webm=supports(video,'video/webm; codecs="vp9, opus"')
 const containers:string[]=[]
 const videoCodecs:string[]=[]
 const audioCodecs:string[]=[]
 if(mp4){containers.push('mp4');videoCodecs.push('h264');audioCodecs.push('aac')}
 if(webm){containers.push('webm');videoCodecs.push('vp9');audioCodecs.push('opus')}
 const hls=supports(video,'application/vnd.apple.mpegurl')||('MediaSource'in window)
 const preference=localStorage.getItem('mediaphile-quality')
 const maxWidth=preference==='720p'?1280:preference==='1080p'?1920:3840
 const maxHeight=preference==='720p'?720:preference==='1080p'?1080:2160
 let clientId=localStorage.getItem('mediaphile-client-id')
 if(!clientId){clientId='mpc-'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('mediaphile-client-id',clientId)}
 return {clientId,containers,videoCodecs,audioCodecs,subtitleCodecs:['webvtt'],maxWidth,maxHeight,maxVideoBitrate:40_000_000,hls,rangeRequests:true}
}
