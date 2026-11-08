import { createHash } from 'crypto'
import { gunzipSync } from 'zlib'

/**
 * Upload bundle: gzip( "PHB1" + repeated [32-byte sha256][uint32 BE length][bytes] ). Content-addressed, so it carries
 * no paths; the server verifies every hash. The CLI has a matching encoder (packages/cli/src/lib/deployBundle.ts).
 */
export const BUNDLE_MAGIC = Buffer.from('PHB1')

export class BundleError extends Error {}

export type BundleEntry = { hash: string; data: Buffer }

export const encodeBundle = (entries: { data: Buffer }[]): Buffer => {
  const parts: Buffer[] = [BUNDLE_MAGIC]
  for (const { data } of entries) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    parts.push(createHash('sha256').update(data).digest(), len, data)
  }
  return Buffer.concat(parts)
}

export const decodeBundle = (gz: Buffer, maxOutputBytes: number): BundleEntry[] => {
  let raw: Buffer
  try {
    raw = gunzipSync(gz, { maxOutputLength: maxOutputBytes })
  } catch (e) {
    throw new BundleError(`Could not decompress bundle: ${(e as Error).message}`)
  }
  if (raw.length < 4 || !raw.subarray(0, 4).equals(BUNDLE_MAGIC)) {
    throw new BundleError(`Not a PocketHost deploy bundle`)
  }
  const out: BundleEntry[] = []
  let off = 4
  while (off < raw.length) {
    if (off + 36 > raw.length) throw new BundleError(`Truncated bundle`)
    const hash = raw.subarray(off, off + 32).toString('hex')
    const len = raw.readUInt32BE(off + 32)
    off += 36
    if (off + len > raw.length) throw new BundleError(`Truncated bundle`)
    const data = raw.subarray(off, off + len)
    off += len
    const actual = createHash('sha256').update(data).digest('hex')
    if (actual !== hash) throw new BundleError(`Hash mismatch for ${hash}`)
    out.push({ hash, data })
  }
  return out
}
