import { createHash } from 'crypto'

/**
 * Upload bundle for the deploy API: "PHB1" + repeated [32-byte sha256][uint32 BE length][bytes], gzipped by the
 * caller. Must match packages/pockethost/src/services/DeployService/bundle.ts.
 */
export const BUNDLE_MAGIC = Buffer.from('PHB1')

export const sha256 = (data: Buffer) =>
  createHash('sha256').update(data).digest('hex')

export const encodeBundle = (entries: Buffer[]): Buffer => {
  const parts: Buffer[] = [BUNDLE_MAGIC]
  for (const data of entries) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    parts.push(createHash('sha256').update(data).digest(), len, data)
  }
  return Buffer.concat(parts)
}

/** Groups files into batches of at most `maxBytes` raw bytes (a single larger file gets its own batch). */
export const batchBySize = <T extends { size: number }>(
  items: T[],
  maxBytes: number
): T[][] => {
  const batches: T[][] = []
  let cur: T[] = []
  let curBytes = 0
  for (const item of items) {
    if (cur.length > 0 && curBytes + item.size > maxBytes) {
      batches.push(cur)
      cur = []
      curBytes = 0
    }
    cur.push(item)
    curBytes += item.size
  }
  if (cur.length > 0) batches.push(cur)
  return batches
}
