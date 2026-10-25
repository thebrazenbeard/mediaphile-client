import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {AuthProvider} from '../auth/AuthProvider'
import type {ApiClient} from '../api/client'
import type {Library,User} from '../api/types'
import {Settings} from './Settings'

afterEach(()=>cleanup())

describe('Subtitle Manager library selection',()=>{
 it('starts at the first page when switching from a later page of another library',async()=>{
  const libraries=[
   {id:'large',name:'Large Library',mediaType:'tv',enabled:true},
   {id:'small',name:'Small Library',mediaType:'tv',enabled:true}
  ] as Library[]
  const api={
   libraries:vi.fn(async()=>({libraries})),
   subtitleOverview:vi.fn(async(libraryId:string,offset:number)=>({
    items:[],total:libraryId==='large'?55:3,limit:25,offset
   }))
  } as unknown as ApiClient
  render(<AuthProvider value={{api,user:{admin:true} as User,onLogout:vi.fn()}}><Settings/></AuthProvider>)

  await waitFor(()=>expect(screen.getAllByRole('button',{name:'Check subtitles'})).toHaveLength(2))
  fireEvent.click(screen.getAllByRole('button',{name:'Check subtitles'})[0])
  await waitFor(()=>expect(screen.getByText(/55 indexed media parts.*offset 0/)).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:'Next'}))
  await waitFor(()=>expect(screen.getByText(/55 indexed media parts.*offset 25/)).toBeTruthy())

  fireEvent.click(screen.getAllByRole('button',{name:'Check subtitles'})[1])
  await waitFor(()=>expect((api.subtitleOverview as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('small',0))
  expect(screen.getByText(/3 indexed media parts.*offset 0/)).toBeTruthy()
 })
})
