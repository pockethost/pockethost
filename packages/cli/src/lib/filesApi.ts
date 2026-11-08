import { createReadStream, createWriteStream } from 'fs'
import { mkdir, rename, stat, utimes } from 'fs/promises'
import { dirname } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { createDeployClient, DeployApiError } from './deployApi'
import { resolveDeployCredential } from './token'

/** Raw bytes per upload request. The server takes up to 64 MB; Cloudflare allows 100 MB. */
export const FILE_CHUNK_BYTES = 32 * 1024 * 1024

export type RemoteEntry = {
  path: string
  isDirectory: boolean
  size: number
  mtime: number
}

/** Remote paths are POSIX, relative to the instance root, with no leading or trailing slash. */
export const normalizeRemotePath = (p = '') =>
  p
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '')
    .replace(/\/+$/, '')
    .replace(/^\.$/, '')

const errorFrom = async (res: Response, instanceName: string) => {
  const text = await res.text().catch(() => '')
  let message = text.slice(0, 300) || `HTTP ${res.status}`
  try {
    message = (JSON.parse(text) as { message?: string }).message || message
  } catch {
    // not JSON
  }
  if (res.status === 404 && /not found$/.test(message) && message.includes('.'))
    message = `Instance '${instanceName}' not found, or this token cannot access it.`
  return new DeployApiError(res.status, message)
}

/** Client for `/_ph/deploy/v1/files`: list, download, upload and delete instance files over HTTPS. */
export const createFilesClient = async (instanceName: string) => {
  const api = createDeployClient(instanceName, await resolveDeployCredential())
  const url = (path: string, q: Record<string, string | number | boolean>) => {
    const u = new URL(`${api.base}/files${path}`)
    for (const [k, v] of Object.entries(q)) u.searchParams.set(k, `${v}`)
    return u.toString()
  }
  const send = async (
    method: string,
    path: string,
    q: Record<string, string | number | boolean>,
    body?: Uint8Array<ArrayBuffer>
  ) => {
    let res: Response
    try {
      res = await fetch(url(path, q), {
        method,
        headers: {
          ...api.headers,
          ...(body ? { 'Content-Type': 'application/octet-stream' } : {}),
        },
        body,
      })
    } catch (e) {
      throw new DeployApiError(
        0,
        `Could not reach ${api.base}: ${(e as Error).message}`
      )
    }
    if (!res.ok) throw await errorFrom(res, instanceName)
    return res
  }

  const list = async (path = '', recursive = false) => {
    const res = await send('GET', '', {
      path: normalizeRemotePath(path),
      recursive: recursive ? 1 : 0,
    })
    return (await res.json()) as {
      path: string
      entries: RemoteEntry[]
      truncated: boolean
    }
  }

  /** Streams a remote file to `dest` (via a temp file) and copies the remote mtime. */
  const download = async (remote: string, dest: string) => {
    const res = await send('GET', '/raw', { path: normalizeRemotePath(remote) })
    await mkdir(dirname(dest), { recursive: true })
    const tmp = `${dest}.pockethost-download`
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp))
    await rename(tmp, dest)
    const mtime = Number(res.headers.get('x-ph-mtime'))
    if (mtime > 0) await utimes(dest, new Date(), new Date(mtime))
  }

  /** Uploads a local file in chunks; the server moves it into place after the last one. */
  const upload = async (
    local: string,
    remote: string,
    onProgress?: (sent: number, total: number) => void
  ) => {
    const { size } = await stat(local)
    const path = normalizeRemotePath(remote)
    if (size === 0) {
      await send(
        'PUT',
        '/raw',
        { path, offset: 0, final: 1 },
        new Uint8Array(0)
      )
      return size
    }
    let offset = 0
    // Reads come back at most FILE_CHUNK_BYTES each; the last one (offset reaches size) finishes the upload.
    for await (const chunk of createReadStream(local, {
      highWaterMark: FILE_CHUNK_BYTES,
    })) {
      const buf = chunk as Buffer
      const final = offset + buf.length >= size
      await send(
        'PUT',
        '/raw',
        { path, offset, final: final ? 1 : 0 },
        new Uint8Array(buf)
      )
      offset += buf.length
      onProgress?.(offset, size)
    }
    if (offset !== size)
      throw new Error(`${local} changed size during upload; run it again`)
    return size
  }

  const remove = async (remote: string, recursive = false) => {
    await send('DELETE', '', {
      path: normalizeRemotePath(remote),
      recursive: recursive ? 1 : 0,
    })
  }

  return { base: api.base, list, download, upload, remove }
}
