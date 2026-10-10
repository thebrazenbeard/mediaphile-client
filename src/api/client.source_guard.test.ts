import { describe, expect, it } from 'vitest'
import { ApiClient } from './client'

describe('token-bound server origin', () => {
  it('refuses an absolute path to a different host', () => {
    const client = new ApiClient('http://192.168.1.10:9876/')
    expect(() => client.url('https://example.com/ingest')).toThrow(/origin|server/i)
    expect(() => client.url('//example.com/ingest')).toThrow(/origin|server/i)
    expect(client.url('/api/v1/server')).toBe('http://192.168.1.10:9876/api/v1/server')
  })
})
