import {describe,it,expect} from 'vitest'
import {validateServerURL} from './serverUrl'
describe('server URL',()=>{
  it('accepts RFC1918 endpoints',()=>expect(validateServerURL('http://192.168.1.5:8097/login')).toBe('http://192.168.1.5:8097'))
  it('rejects public and credentialed endpoints',()=>{
    expect(()=>validateServerURL('https://example.com')).toThrow()
    expect(()=>validateServerURL('http://8.8.8.8')).toThrow()
    expect(()=>validateServerURL('http://user:pw@192.168.1.5')).toThrow()
  })
})
