import express, { type Request, type RequestHandler, type Response } from 'express'
import { createReadStream, createWriteStream } from 'fs'
import { lstat, mkdir, readdir, realpath, rename, rm, stat } from 'fs/promises'
import { dirname, join, relative, sep } from 'path'
import { pipeline } from 'stream/promises'
import type { InstanceFields } from '../../common'
import { DATA_DIR, isCodePath, isSafeRelativePath, NODE_MODULES_DIR, PATCHES_DIR } from './codeSet'

/**
 * File access over HTTPS, the replacement for SFTP: list, download, upload (chunked) and delete files inside an
 * instance directory. Same reach as SFTP: the code set (`pb_*`, `package.json`, `bun.lock(b)`, `patches/`),
 * `node_modules`, and `pb_data`, which needs the instance powered off for every operation, read or write.
 */

/** Raw bytes per upload chunk. Cloudflare caps request bodies at 100 MB. */
export const MAX_FILE_CHUNK_BYTES = 64 * 1024 * 1024
export const MAX_LIST_ENTRIES = 50_000
export const UPLOAD_SUFFIX = '.ph-upload'

export class FileApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export type FileEntry = { path: string; isDirectory: boolean; size: number; mtime: number }

export { NODE_MODULES_DIR }

/**
 * True when `p` is a path the file API may touch: the code set, `pb_data`, and `node_modules` (at the root or inside a
 * code folder). Deploys only manage the root `node_modules` when the CLI ships it, so this is the other way packages
 * get onto an instance. `.git*` stays out.
 */
export const isFileApiPath = (p: string) => {
  if (!isSafeRelativePath(p)) return false
  const segs = p.split('/')
  const [first] = segs
  if (first === DATA_DIR) return true
  if (segs.some((seg) => seg.startsWith('.git'))) return false
  if (first === NODE_MODULES_DIR || first === PATCHES_DIR) return true
  if (isCodePath(p)) return true
  // Code paths with node_modules inside, e.g. pb_hooks/node_modules/pocketpages/...
  return segs.length > 1 && first!.startsWith('pb_') && segs.includes(NODE_MODULES_DIR)
}

const isDataPath = (p: string) => p.split('/')[0] === DATA_DIR

export type FilesCtx = { instance: InstanceFields; instanceDir: string }

export type FilesRouterDeps = {
  /** Resolves the instance and checks the token. `needWrite` requires a write-scoped token. */
  authorize: (req: Request, needWrite: boolean) => Promise<FilesCtx>
  /** Serializes mutations with deploy commits for the same instance. */
  lock: <T>(key: string, fn: () => Promise<T>) => Promise<T>
  handle: (fn: (req: Request, res: Response) => Promise<unknown>) => RequestHandler
}

/** Maps a client path to a filesystem path, refusing anything that escapes the instance dir or crosses a symlink. */
export const resolveFilePath = async (instanceDir: string, instance: InstanceFields, raw: unknown) => {
  const p = `${raw ?? ''}`.replace(/^\/+|\/+$/g, '')
  if (p === '') return { rel: '', fsPath: instanceDir }
  if (!isFileApiPath(p)) {
    throw new FileApiError(
      400,
      `${p} is outside the files you can reach (pb_data, pb_hooks, pb_migrations, pb_public and other pb_* folders, node_modules, package.json, bun.lock(b), patches/)`
    )
  }
  if (isDataPath(p) && instance.power) {
    throw new FileApiError(409, `Power off the instance before reading or writing pb_data.`)
  }
  const fsPath = join(instanceDir, ...p.split('/'))
  // Walk existing ancestors: none may be a symlink.
  const segs = p.split('/')
  let cur = instanceDir
  for (const seg of segs) {
    cur = join(cur, seg)
    const st = await lstat(cur).catch(() => null)
    if (!st) break
    if (st.isSymbolicLink()) throw new FileApiError(400, `${p} crosses a symbolic link`)
  }
  const realRoot = await realpath(instanceDir).catch(() => instanceDir)
  const realParent = await realpath(dirname(fsPath)).catch(() => null)
  if (realParent && relative(realRoot, realParent).startsWith('..')) throw new FileApiError(400, `Bad path`)
  return { rel: p, fsPath }
}

const toPosix = (p: string) => p.split(sep).join('/')

export const listFiles = async (
  instanceDir: string,
  instance: InstanceFields,
  rel: string,
  fsPath: string,
  recursive: boolean
): Promise<FileEntry[]> => {
  const out: FileEntry[] = []
  const walk = async (dirFs: string, depth: number) => {
    const names = (await readdir(dirFs).catch(() => [] as string[])).sort()
    for (const name of names) {
      if (out.length >= MAX_LIST_ENTRIES) return
      const childFs = join(dirFs, name)
      const childRel = toPosix(relative(instanceDir, childFs))
      if (!isFileApiPath(childRel) || name.endsWith(UPLOAD_SUFFIX)) continue
      const st = await lstat(childFs).catch(() => null)
      if (!st || st.isSymbolicLink()) continue
      const isDirectory = st.isDirectory()
      // At the instance root, a powered-on instance still lists pb_data but can't open it.
      out.push({ path: childRel, isDirectory, size: isDirectory ? 0 : st.size, mtime: Math.round(st.mtimeMs) })
      const canDescend = !(isDataPath(childRel) && instance.power)
      if (isDirectory && canDescend && recursive) await walk(childFs, depth + 1)
    }
  }
  const st = await stat(fsPath).catch(() => null)
  if (!st) throw new FileApiError(404, `${rel || '/'} not found`)
  if (!st.isDirectory()) {
    return [{ path: rel, isDirectory: false, size: st.size, mtime: Math.round(st.mtimeMs) }]
  }
  await walk(fsPath, 0)
  return out
}

export const createFilesRouter = (deps: FilesRouterDeps) => {
  const { authorize, lock, handle } = deps
  const router = express.Router()

  /** `GET /files?path=pb_hooks&recursive=1` */
  router.get(
    '/',
    handle(async (req, res) => {
      const { instance, instanceDir } = await authorize(req, false)
      const { rel, fsPath } = await resolveFilePath(instanceDir, instance, req.query.path)
      const recursive = req.query.recursive === '1' || req.query.recursive === 'true'
      const entries = await listFiles(instanceDir, instance, rel, fsPath, recursive)
      res.json({ path: rel, entries, truncated: entries.length >= MAX_LIST_ENTRIES })
    })
  )

  /** `GET /files/raw?path=pb_data/data.db` streams one file. */
  router.get(
    '/raw',
    handle(async (req, res) => {
      const { instance, instanceDir } = await authorize(req, false)
      const { rel, fsPath } = await resolveFilePath(instanceDir, instance, req.query.path)
      const st = await stat(fsPath).catch(() => null)
      if (!st) throw new FileApiError(404, `${rel} not found`)
      if (!st.isFile()) throw new FileApiError(400, `${rel} is a folder`)
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': `${st.size}`,
        'Cache-Control': 'no-store',
        'X-PH-Mtime': `${Math.round(st.mtimeMs)}`,
      })
      await pipeline(createReadStream(fsPath), res)
    })
  )

  /**
   * `PUT /files/raw?path=pb_data/data.db&offset=0&final=1` writes one chunk. Chunks go to `<path>.ph-upload`; offset 0
   * starts over, any other offset must equal the bytes received so far. `final=1` moves the file into place.
   */
  router.put(
    '/raw',
    express.raw({ type: () => true, limit: MAX_FILE_CHUNK_BYTES }),
    handle(async (req, res) => {
      const { instance, instanceDir } = await authorize(req, true)
      const { rel, fsPath } = await resolveFilePath(instanceDir, instance, req.query.path)
      if (!rel) throw new FileApiError(400, `path is required`)
      const offset = Number(req.query.offset ?? 0)
      if (!Number.isInteger(offset) || offset < 0) throw new FileApiError(400, `Bad offset`)
      const final = req.query.final === '1' || req.query.final === 'true'
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
      const tmp = `${fsPath}${UPLOAD_SUFFIX}`

      const size = await lock(instance.id, async () => {
        const existing = await stat(fsPath).catch(() => null)
        if (existing?.isDirectory()) throw new FileApiError(400, `${rel} is a folder`)
        await mkdir(dirname(fsPath), { recursive: true })
        const have = offset === 0 ? 0 : ((await stat(tmp).catch(() => null))?.size ?? -1)
        if (have !== offset) {
          throw new FileApiError(
            409,
            `Upload out of order: server has ${Math.max(have, 0)} bytes, got offset ${offset}`
          )
        }
        const ws = createWriteStream(tmp, { flags: offset === 0 ? 'w' : 'a' })
        await new Promise<void>((resolve, reject) => {
          ws.on('error', reject)
          ws.end(body, resolve)
        })
        const total = offset + body.length
        if (final) await rename(tmp, fsPath)
        return total
      })
      res.json({ path: rel, size, final })
    })
  )

  /** `DELETE /files?path=pb_migrations/123_bad.js&recursive=1` */
  router.delete(
    '/',
    handle(async (req, res) => {
      const { instance, instanceDir } = await authorize(req, true)
      const { rel, fsPath } = await resolveFilePath(instanceDir, instance, req.query.path)
      if (!rel || !rel.includes('/')) {
        throw new FileApiError(400, `Refusing to delete ${rel || 'the instance root'}; delete files inside it instead`)
      }
      const recursive = req.query.recursive === '1' || req.query.recursive === 'true'
      await lock(instance.id, async () => {
        const st = await lstat(fsPath).catch(() => null)
        if (!st) throw new FileApiError(404, `${rel} not found`)
        if (st.isDirectory()) {
          if (!recursive && (await readdir(fsPath)).length > 0) {
            throw new FileApiError(409, `${rel} is a folder with files in it; pass recursive to delete it`)
          }
          await rm(fsPath, { recursive: true, force: true })
        } else {
          await rm(fsPath, { force: true })
        }
      })
      res.json({ path: rel, deleted: true })
    })
  )

  return router
}
