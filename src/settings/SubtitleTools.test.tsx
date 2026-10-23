import {describe,it,expect,vi,afterEach} from 'vitest'
import {render,fireEvent,screen,waitFor,cleanup} from '@testing-library/react'
import {SubtitleTools} from './SubtitleTools'
import type {ApiClient} from '../api/client'

afterEach(()=>cleanup())

describe('Subtitle Manager batch planning',()=>{
 it('shows persisted advisory actions without publishing subtitle files',async()=>{
  const api={
   subtitleOverview:vi.fn(async()=>({items:[],total:1,limit:25,offset:0})),
   refreshSubtitleQueue:vi.fn(async()=>({
    items:[{partId:'one',fileName:'Movie.mkv',action:'search_published',
    coverage:'missing',disposition:'active',candidateCount:0,
    observedSize:1024,observedModTimeNs:1}],planned:1,total:1,limit:25,offset:0
   })),
   reviewSubtitles:vi.fn(async()=>({
    partId:'one',fileName:'Movie.mkv',nextAction:'search_published',
    decision:{partId:'one',disposition:'active',reason:''},
    review:{englishEmbedded:false,existing:[],existingAudits:[],candidates:[],coverage:'missing'},embedded:[]
   }))
  } as unknown as ApiClient
  render(<SubtitleTools api={api} libraryId="lib"/>)
  await waitFor(()=>expect(screen.getByText(/1 indexed media parts/)).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:/inspect current page into recovery queue/i}))
  await waitFor(()=>expect(screen.getByText(/search_published/)).toBeTruthy())
  expect((api.refreshSubtitleQueue as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('lib',25,0)
  expect(screen.getByText(/planning only; no downloads or file changes/i)).toBeTruthy()
 })
})

it('requires a deliberate search click and never offers publication of provider metadata',async()=>{
 const api={
  subtitleOverview:vi.fn(async()=>({items:[{partId:'p1',fileName:'Example (2026).mkv',review:{
   existing:[],existingAudits:[],candidates:[],coverage:'missing'},decision:{disposition:'active',reason:''},
   nextAction:'search_published',embedded:[]}],total:1,limit:25,offset:0})),
  reviewSubtitles:vi.fn(async()=>({partId:'p1',fileName:'Example (2026).mkv',
   review:{existing:[],existingAudits:[],candidates:[],coverage:'missing'},decision:{disposition:'active',reason:''},
   nextAction:'search_published',embedded:[]})),
  searchPublishedSubtitles:vi.fn(async()=>({partId:'p1',provider:'opensubtitles',downloaded:false,published:false,
   note:'metadata only',candidates:[{provider:'opensubtitles',subtitleId:'123',fileId:455,
   release:'Example.WEB',fileName:'Example.srt',language:'en',trusted:true,hearingImpaired:false,moviehashMatch:false}]}))
 } as unknown as ApiClient
 render(<SubtitleTools api={api} libraryId="library"/>)
 await waitFor(()=>expect(screen.getByText(/1 indexed media parts/)).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'Review'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:/search published English subtitles/i})).toBeTruthy())
 expect((api.searchPublishedSubtitles as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:/search published English subtitles/i}))
 await waitFor(()=>expect(screen.getByText(/Example.WEB/)).toBeTruthy())
 expect((api.searchPublishedSubtitles as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('p1','Example (2026)')
 expect(screen.getByRole('region',{name:'Published subtitle candidates'}).textContent).toContain('nothing downloaded or installed')
 expect(screen.queryByRole('button',{name:/install published/i})).toBeNull()
})
