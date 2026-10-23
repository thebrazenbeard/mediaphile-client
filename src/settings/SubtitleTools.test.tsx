import {describe,it,expect,vi} from 'vitest'
import {render,fireEvent,screen,waitFor} from '@testing-library/react'
import {SubtitleTools} from './SubtitleTools'
import type {ApiClient} from '../api/client'

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
