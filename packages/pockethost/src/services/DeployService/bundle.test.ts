import { createHash } from 'crypto'
import { describe, expect, it } from 'vitest'
import { gzipSync } from 'zlib'
import { BundleError, decodeBundle, encodeBundle } from './bundle'

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')

describe('deploy bundle', () => {
  it('round-trips entries', () => {
    const a = Buffer.from('hello')
    const b = Buffer.alloc(0)
    const c = Buffer.alloc(100_000, 7)
    const out = decodeBundle(gzipSync(encodeBundle([{ data: a }, { data: b }, { data: c }])), 1e7)
    expect(out.map((e) => e.hash)).toEqual([sha(a), sha(b), sha(c)])
    expect(out[2]!.data.equals(c)).toBe(true)
  })

  it('rejects tampered content', () => {
    const raw = encodeBundle([{ data: Buffer.from('hello') }])
    raw[raw.length - 1] = 'X'.charCodeAt(0)
    expect(() => decodeBundle(gzipSync(raw), 1e6)).toThrow(/Hash mismatch/)
  })

  it('rejects junk, truncation and bombs', () => {
    expect(() => decodeBundle(Buffer.from('nope'), 1e6)).toThrow(BundleError)
    expect(() => decodeBundle(gzipSync(Buffer.from('XXXX')), 1e6)).toThrow(/Not a PocketHost/)
    const raw = encodeBundle([{ data: Buffer.from('hello') }])
    expect(() => decodeBundle(gzipSync(raw.subarray(0, raw.length - 2)), 1e6)).toThrow(/Truncated/)
    expect(() => decodeBundle(gzipSync(encodeBundle([{ data: Buffer.alloc(10_000) }])), 1000)).toThrow(BundleError)
  })
})
