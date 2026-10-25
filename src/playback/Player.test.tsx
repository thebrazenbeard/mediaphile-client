import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {AuthProvider} from '../auth/AuthProvider'
import type {ApiClient} from '../api/client'
import type {User} from '../api/types'
import {Player} from './Player'

afterEach(()=>{vi.useRealTimers();cleanup()})

function deferred(){
 let resolve!: (value:unknown)=>void
 const promise=new Promise<unknown>(done=>{resolve=done})
 return {promise,resolve:()=>resolve({id:'session'})}
}

it('persists the latest paused position before ending a playback session',async()=>{
 const first=deferred(),second=deferred(),final=deferred()
 const updateSession=vi.fn()
  .mockImplementationOnce(()=>first.promise)
  .mockImplementationOnce(()=>second.promise)
  .mockImplementationOnce(()=>final.promise)
 const endSession=vi.fn(async()=>{})
 const api={
  item:vi.fn(async()=>({item:{id:'film',title:'Synthetic Film'}})),
  playbackState:vi.fn(async()=>({resumeMs:0})),
  decide:vi.fn(async()=>({mode:'DIRECT_PLAY',sourceId:'source',url:'/api/v1/media/source',reasons:[]})),
  createSession:vi.fn(async()=>({id:'session'})),
  updateSession,
  endSession,
  url:vi.fn((path:string)=>'http://127.0.0.1:8097'+path),
 } as unknown as ApiClient

 render(<AuthProvider value={{api,user:{id:'user'} as User,onLogout:vi.fn()}}>
  <MemoryRouter initialEntries={['/','/play/film']} initialIndex={1}>
   <Routes><Route path="/" element={<div>Home</div>}/><Route path="/play/:id" element={<Player/>}/></Routes>
  </MemoryRouter>
 </AuthProvider>)

 const video=await screen.findByLabelText('Playing Synthetic Film') as HTMLVideoElement
 fireEvent.play(video)
 await waitFor(()=>expect(updateSession).toHaveBeenCalledTimes(1))
 video.currentTime=2.1
 fireEvent.pause(video)
 fireEvent.click(screen.getByRole('button',{name:/EXIT PLAYER/}))

 expect(updateSession).toHaveBeenCalledTimes(1)
 expect(endSession).not.toHaveBeenCalled()
 first.resolve()
 await waitFor(()=>expect(updateSession).toHaveBeenCalledTimes(2))
 expect(updateSession).toHaveBeenNthCalledWith(2,'session',2100,'paused')
 expect(endSession).not.toHaveBeenCalled()
 second.resolve()
 await waitFor(()=>expect(updateSession).toHaveBeenCalledTimes(3))
 expect(updateSession).toHaveBeenNthCalledWith(3,'session',2100,'paused')
 expect(endSession).not.toHaveBeenCalled()
 final.resolve()
 await waitFor(()=>expect(endSession).toHaveBeenCalledWith('session','user_stop'))
 await screen.findByText('Home')
 expect(endSession).toHaveBeenCalledTimes(1)
})

it('allows exit after bounded waits when progress and session-end requests stall',async()=>{
 const never=new Promise<never>(()=>{})
 const updateSession=vi.fn(()=>never)
 const endSession=vi.fn(()=>never)
 const api={
  item:vi.fn(async()=>({item:{id:'film',title:'Synthetic Film'}})),
  playbackState:vi.fn(async()=>({resumeMs:0})),
  decide:vi.fn(async()=>({mode:'DIRECT_PLAY',sourceId:'source',url:'/api/v1/media/source',reasons:[]})),
  createSession:vi.fn(async()=>({id:'session'})),
  updateSession,endSession,
  url:vi.fn((path:string)=>'http://127.0.0.1:8097'+path),
 } as unknown as ApiClient

 render(<AuthProvider value={{api,user:{id:'user'} as User,onLogout:vi.fn()}}>
  <MemoryRouter initialEntries={['/','/play/film']} initialIndex={1}>
   <Routes><Route path="/" element={<div>Home</div>}/><Route path="/play/:id" element={<Player/>}/></Routes>
  </MemoryRouter>
 </AuthProvider>)
 const video=await screen.findByLabelText('Playing Synthetic Film') as HTMLVideoElement
 fireEvent.play(video)
 await waitFor(()=>expect(updateSession).toHaveBeenCalledTimes(1))
 vi.useFakeTimers()
 fireEvent.click(screen.getByRole('button',{name:/EXIT PLAYER/}))
 expect(screen.queryByText('Home')).toBeNull()
 await act(async()=>{await vi.advanceTimersByTimeAsync(4000)})
 expect(endSession).toHaveBeenCalledTimes(1)
 expect(screen.queryByText('Home')).toBeNull()
 await act(async()=>{await vi.advanceTimersByTimeAsync(4000)})
 expect(screen.getByText('Home')).toBeTruthy()
 expect(endSession).toHaveBeenCalledTimes(1)
})
