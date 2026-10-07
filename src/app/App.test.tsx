import{describe,it,expect,vi}from'vitest'
import{render,screen,waitFor}from'@testing-library/react'
import{MemoryRouter}from'react-router-dom'
import{App}from'./App'
describe('app startup',()=>{
 it('offers bootstrap for a fresh local server',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({id:'test',name:'Mediaphile',apiVersions:['v1'],initialized:false}),{status:200})))
  render(<MemoryRouter><App/></MemoryRouter>)
  await waitFor(()=>expect(screen.getByText('Make it yours.')).toBeInTheDocument())
  expect(screen.getByText('Create local account →')).toBeInTheDocument()
  vi.unstubAllGlobals()
 })
})
