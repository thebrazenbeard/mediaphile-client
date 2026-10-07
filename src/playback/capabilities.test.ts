import{describe,it,expect,vi}from'vitest'
import{clientCapabilities}from'./capabilities'
describe('client media capabilities',()=>{
 it('reports formats conservatively',()=>{
  vi.spyOn(HTMLMediaElement.prototype,'canPlayType').mockImplementation((type)=>type.includes('avc1')?'probably':'')
  const caps=clientCapabilities()
  expect(caps.containers).toEqual(['mp4']);expect(caps.videoCodecs).toEqual(['h264'])
  expect(caps.audioCodecs).toEqual(['aac']);expect(caps.rangeRequests).toBe(true)
  vi.restoreAllMocks()
 })
})
