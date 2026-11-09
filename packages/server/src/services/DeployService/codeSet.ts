/**
 * The deploy "code set": the only files the deploy API may write or delete inside an instance directory. It mirrors the
 * CLI's DEFAULT_INCLUDES / DEFAULT_EXCLUDES (plus ftp-deploy's `.git*` excludes). `pb_data` is never part of it.
 *
 * The root `node_modules` tree is part of it too (the CLI ships the production dependency tree since the server no
 * longer installs packages). `node_modules` anywhere else (e.g. `pb_hooks/node_modules`) stays out.
 */

export const ROOT_CODE_FILES = ['package.json', 'bun.lock', 'bun.lockb'] as const
export const PATCHES_DIR = 'patches'
export const DATA_DIR = 'pb_data'
export const NODE_MODULES_DIR = 'node_modules'

export const MAX_MANIFEST_FILES = 20_000
export const MAX_PATH_LENGTH = 1024

const HASH_RE = /^[0-9a-f]{64}$/

export const isSha256Hex = (v: unknown): v is string => typeof v === 'string' && HASH_RE.test(v)

/** Path shape check: relative POSIX path with no empty, `.` or `..` segments. */
export const isSafeRelativePath = (p: string) => {
  if (!p || p.length > MAX_PATH_LENGTH) return false
  if (p.startsWith('/') || p.includes('\\') || p.includes('\0')) return false
  return p.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..')
}

const isGitSegment = (seg: string) => seg.startsWith('.git')

/** True when a top-level directory/file name is a code root (the walk starts from these). */
export const isCodeRoot = (name: string) =>
  (name.startsWith('pb_') && name !== DATA_DIR) ||
  name === PATCHES_DIR ||
  (ROOT_CODE_FILES as readonly string[]).includes(name)

/** True when `p` (a file path relative to the instance root) belongs to the code set. */
export const isCodePath = (p: string) => {
  if (!isSafeRelativePath(p)) return false
  const segs = p.split('/')
  if (segs.some(isGitSegment)) return false
  const [first] = segs
  if (!first) return false
  // Root node_modules, any depth (nested node_modules and @scope dirs included). Never node_modules elsewhere.
  if (first === NODE_MODULES_DIR) return segs.length > 1
  if (segs.includes(NODE_MODULES_DIR)) return false
  if (segs.length === 1) {
    return (ROOT_CODE_FILES as readonly string[]).includes(first) || (first.startsWith('pb_') && first !== DATA_DIR)
  }
  if (first === DATA_DIR) return false
  return first.startsWith('pb_') || first === PATCHES_DIR
}

export type Manifest = Record<string, string>

export class ManifestError extends Error {}

/** Validates a client manifest `{ path: sha256 }`. Throws ManifestError with a user-facing message. */
export const validateManifest = (raw: unknown): Manifest => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ManifestError(`files must be an object of { path: sha256 }`)
  }
  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length > MAX_MANIFEST_FILES) {
    const nm = entries.filter(([p]) => p.split('/')[0] === NODE_MODULES_DIR).length
    throw new ManifestError(
      `Too many files (${entries.length}${nm ? `, ${nm} of them in node_modules` : ''}); a deploy can have at most ` +
        `${MAX_MANIFEST_FILES}.${nm ? ` Make sure only production dependencies are deployed.` : ''}`
    )
  }
  const out: Manifest = {}
  for (const [path, hash] of entries) {
    if (!isCodePath(path)) {
      throw new ManifestError(
        `${path} is outside the deployable set (pb_* except pb_data, package.json, bun.lock(b), patches/, ` +
          `node_modules/ at the project root; no .git* files, no node_modules inside other folders)`
      )
    }
    if (!isSha256Hex(hash)) {
      throw new ManifestError(`${path}: expected a lowercase sha256 hex digest`)
    }
    out[path] = hash
  }
  // A path can't be both a file and a directory.
  const paths = new Set(Object.keys(out))
  for (const p of paths) {
    const segs = p.split('/')
    for (let i = 1; i < segs.length; i++) {
      const prefix = segs.slice(0, i).join('/')
      if (paths.has(prefix)) {
        throw new ManifestError(`${prefix} is both a file and a directory`)
      }
    }
  }
  return out
}
