import { ChildProcess, execFile, spawn } from 'child_process'
import { createHash } from 'crypto'
import { Readable } from 'stream'
import { promisify } from 'util'
import { archiveObjectName } from './instanceArchive'

/**
 * Archive storage through rclone (any rclone remote; production uses IDrive e2). Archives are `tar | zstd` of
 * `$DATA_ROOT/instances/<id>/`, stored at `<remote>/<id>.tar.zst`.
 */

const execFileAsync = promisify(execFile)

const remotePath = (remote: string, instanceId: string) =>
  `${remote.replace(/\/+$/, '')}/${archiveObjectName(instanceId)}`

const waitExit = (proc: ChildProcess, label: string) =>
  new Promise<void>((resolve, reject) => {
    let stderr = ``
    proc.stderr?.on(`data`, (d) => {
      stderr += d.toString()
      if (stderr.length > 4000) stderr = stderr.slice(-4000)
    })
    proc.once(`error`, reject)
    proc.once(`close`, (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${label} exited with ${code}: ${stderr.trim()}`))
    })
  })

export type ArchiveDigest = { bytes: number; sha256: string }

/** Hashes and counts a stream while forwarding it. */
const tap = (
  source: Readable,
  sink: NodeJS.WritableStream | null,
  digest: { bytes: number; hash: ReturnType<typeof createHash> }
) => {
  source.on(`data`, (chunk: Buffer) => {
    digest.bytes += chunk.length
    digest.hash.update(chunk)
  })
  if (sink) source.pipe(sink)
  else source.resume()
}

/** Tar | zstd | rclone rcat, hashing the compressed bytes on the way. */
export const uploadInstanceArchive = async (instancesRoot: string, instanceId: string, remote: string) => {
  const tar = spawn(`nice`, [`-n`, `19`, `tar`, `-C`, instancesRoot, `-cf`, `-`, instanceId], {
    stdio: [`ignore`, `pipe`, `pipe`],
  })
  const zstd = spawn(`nice`, [`-n`, `19`, `zstd`, `-3`, `-T2`, `-q`, `-c`], { stdio: [`pipe`, `pipe`, `pipe`] })
  // --s3-no-check-bucket: the bucket exists and the IDrive key can't CreateBucket, which rclone tries by default.
  // --s3-chunk-size: a stream of unknown size is capped at chunk × 10,000 parts. The 5Mi default (~48 GiB) is too close
  // to the largest instances; 64Mi allows ~625 GiB for ~256 MiB of buffers (chunk × 4 concurrent parts).
  const rcat = spawn(
    `rclone`,
    [`rcat`, `--s3-no-check-bucket`, `--s3-chunk-size`, `64Mi`, remotePath(remote, instanceId)],
    { stdio: [`pipe`, `ignore`, `pipe`] }
  )

  const digest = { bytes: 0, hash: createHash(`sha256`) }
  tar.stdout!.pipe(zstd.stdin!)
  tap(zstd.stdout!, rcat.stdin!, digest)

  await Promise.all([waitExit(tar, `tar`), waitExit(zstd, `zstd`), waitExit(rcat, `rclone rcat`)])
  return { bytes: digest.bytes, sha256: digest.hash.digest(`hex`) } satisfies ArchiveDigest
}

/** Reads the archive back: same bytes, same hash, and a valid zstd stream. */
export const verifyInstanceArchive = async (remote: string, instanceId: string, expected: ArchiveDigest) => {
  const cat = spawn(`rclone`, [`cat`, remotePath(remote, instanceId)], { stdio: [`ignore`, `pipe`, `pipe`] })
  const test = spawn(`zstd`, [`-t`, `-q`], { stdio: [`pipe`, `ignore`, `pipe`] })
  const digest = { bytes: 0, hash: createHash(`sha256`) }
  tap(cat.stdout!, test.stdin!, digest)
  await Promise.all([waitExit(cat, `rclone cat`), waitExit(test, `zstd -t`)])
  const actual = { bytes: digest.bytes, sha256: digest.hash.digest(`hex`) }
  if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
    throw new Error(
      `Archive mismatch for ${instanceId}: uploaded ${expected.bytes}/${expected.sha256}, read back ${actual.bytes}/${actual.sha256}`
    )
  }
  return actual
}

/** Rclone cat | zstd -d | tar -x into `instancesRoot`. */
export const downloadInstanceArchive = async (remote: string, instanceId: string, instancesRoot: string) => {
  const cat = spawn(`rclone`, [`cat`, remotePath(remote, instanceId)], { stdio: [`ignore`, `pipe`, `pipe`] })
  const unzstd = spawn(`zstd`, [`-d`, `-q`, `-c`], { stdio: [`pipe`, `pipe`, `pipe`] })
  const untar = spawn(`tar`, [`-C`, instancesRoot, `-xf`, `-`], { stdio: [`pipe`, `ignore`, `pipe`] })
  cat.stdout!.pipe(unzstd.stdin!)
  unzstd.stdout!.pipe(untar.stdin!)
  await Promise.all([waitExit(cat, `rclone cat`), waitExit(unzstd, `zstd -d`), waitExit(untar, `tar -x`)])
}

export type ArchiveListing = { name: string; size: number; modTimeMs: number }

export const listInstanceArchives = async (remote: string): Promise<ArchiveListing[]> => {
  try {
    const { stdout } = await execFileAsync(`rclone`, [`lsjson`, `--files-only`, remote], {
      maxBuffer: 256 * 1024 * 1024,
    })
    const rows = JSON.parse(stdout) as Array<{ Name: string; Size: number; ModTime: string }>
    return rows.map((r) => ({ name: r.Name, size: r.Size, modTimeMs: Date.parse(r.ModTime) }))
  } catch (e) {
    // A prefix with no objects yet does not exist on S3 remotes.
    if (`${e}`.includes(`directory not found`)) return []
    throw e
  }
}

export const deleteInstanceArchive = async (remote: string, instanceId: string) => {
  await execFileAsync(`rclone`, [`deletefile`, remotePath(remote, instanceId)])
}

/** Short-lived presigned URL for a direct download from object storage. */
export const presignInstanceArchive = async (remote: string, instanceId: string, expire = `1h`) => {
  const { stdout } = await execFileAsync(`rclone`, [`link`, `--expire`, expire, remotePath(remote, instanceId)])
  const url = stdout.trim()
  if (!/^https?:\/\//.test(url)) throw new Error(`rclone link returned no URL`)
  return url
}
