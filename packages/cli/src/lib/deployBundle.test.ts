import { describe, expect, it } from 'vitest'
import { batchBySize, encodeBundle, sha256 } from './deployBundle'

describe('deployBundle', () => {
  it('encodes magic + hash + length + data', () => {
    const data = Buffer.from('hi')
    const out = encodeBundle([data])
    expect(out.subarray(0, 4).toString()).toBe('PHB1')
    expect(out.subarray(4, 36).toString('hex')).toBe(sha256(data))
    expect(out.readUInt32BE(36)).toBe(2)
    expect(out.subarray(40).toString()).toBe('hi')
  })

  it('batches by size, giving oversized items their own batch', () => {
    const items = [
      { size: 4 },
      { size: 4 },
      { size: 4 },
      { size: 20 },
      { size: 1 },
    ]
    expect(batchBySize(items, 10).map((b) => b.map((i) => i.size))).toEqual([
      [4, 4],
      [4],
      [20],
      [1],
    ])
    expect(batchBySize([], 10)).toEqual([])
  })
})
