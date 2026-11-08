import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'fs'
import { globSync } from 'glob'
import { dirname, join, sep } from 'path'

/**
 * Collects the production `node_modules` tree of a project as a flat list of files, so it can be deployed as plain
 * files (PocketHost doesn't run `npm install`).
 *
 * - Starts from `dependencies` + `optionalDependencies` in the project's package.json (never `devDependencies`), then
 *   follows each package's own `dependencies`, `optionalDependencies` and resolvable `peerDependencies`.
 * - Resolves packages the way Node does: walk up from the requiring package's real directory through `node_modules`
 *   folders. That handles hoisted npm/bun installs, pnpm's `.pnpm` store and workspace links.
 * - Symlinks are followed and disappear: every entry points at a real file on disk (`source`) and gets a logical
 *   `path` under `node_modules/`.
 * - Output layout is npm-style: a package goes to `node_modules/<name>` unless another version already lives there for
 *   that requirer, in which case it's nested under the requirer (`node_modules/a/node_modules/<name>`).
 */

export type NodeModulesFile = {
  /** Logical POSIX path relative to the project root, e.g. `node_modules/marked/lib/marked.cjs` */
  path: string
  /** Absolute path of the real file on disk (symlinks resolved) */
  source: string
}

export type NodeModulesPackage = {
  name: string
  version: string
  /** Logical directory, e.g. `node_modules/marked` */
  path: string
  /** Real directory on disk */
  source: string
}

export type NodeModulesResult = {
  files: NodeModulesFile[]
  packages: NodeModulesPackage[]
  /** Required dependencies that couldn't be found on disk (run your package manager's install first). */
  missing: { name: string; requiredBy: string }[]
}

type PackageJson = {
  name?: string
  version?: string
  files?: string[]
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const readPackageJson = (dir: string): PackageJson => {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  } catch {
    return {}
  }
}

const toPosix = (p: string) => p.split(sep).join('/')

/** Node-style lookup: `<dir>/node_modules/<name>` for `fromDir` and each of its ancestors. Returns the real path. */
export const resolvePackageDir = (name: string, fromDir: string) => {
  let dir = fromDir
  for (;;) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json')))
      return realpathSync(candidate)
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/** A package that isn't inside any node_modules folder is a local link (workspace, `file:`, `link:`). */
const isLinkedSource = (realDir: string) =>
  !toPosix(realDir).split('/').includes('node_modules')

const SKIP_DIRS = new Set(['node_modules'])
const isSkippedName = (name: string) =>
  SKIP_DIRS.has(name) || name.startsWith('.git')

/** Every file in a package directory, following symlinks, skipping nested node_modules and .git*. */
const walkPackage = (realDir: string): string[] => {
  const out: string[] = []
  const seen = new Set<string>()
  const walk = (dir: string, rel: string) => {
    const real = realpathSync(dir)
    if (seen.has(real)) return
    seen.add(real)
    for (const name of readdirSync(dir).sort()) {
      if (isSkippedName(name)) continue
      const abs = join(dir, name)
      let st
      try {
        st = statSync(abs) // follows symlinks
      } catch {
        continue // dangling symlink
      }
      const childRel = rel ? `${rel}/${name}` : name
      if (st.isDirectory()) walk(abs, childRel)
      else if (st.isFile()) out.push(childRel)
    }
  }
  walk(realDir, '')
  return out
}

/**
 * Files a linked (workspace) package would publish: package.json, README/LICENSE and its `files` entries. Without a
 * `files` field the whole directory ships.
 */
const linkedPackageFiles = (realDir: string, pkg: PackageJson): string[] => {
  if (!Array.isArray(pkg.files) || pkg.files.length === 0)
    return walkPackage(realDir)
  const all = walkPackage(realDir)
  const patterns = pkg.files.flatMap((f) => {
    const clean = f.replace(/^\.\//, '').replace(/\/$/, '')
    return [clean, `${clean}/**`]
  })
  const matched = new Set(
    globSync(patterns, {
      cwd: realDir,
      nodir: true,
      dot: true,
      follow: true,
    }).map(toPosix)
  )
  return all.filter(
    (f) =>
      matched.has(f) ||
      f === 'package.json' ||
      /^(readme|license|licence)(\.|$)/i.test(f)
  )
}

const depNames = (pkg: PackageJson, isRoot: boolean) => {
  const required = Object.keys(pkg.dependencies ?? {})
  const optional = Object.keys(pkg.optionalDependencies ?? {})
  const peers = isRoot ? [] : Object.keys(pkg.peerDependencies ?? {})
  return { required, optional: [...optional, ...peers] }
}

export const collectNodeModules = (projectDir: string): NodeModulesResult => {
  const rootDir = realpathSync(projectDir)
  const placed = new Map<string, string>() // logical dir -> real dir
  const packages: NodeModulesPackage[] = []
  const missing: NodeModulesResult['missing'] = []

  /** First package named `name` that Node would find when requiring from logical dir `from`. */
  const lookup = (name: string, from: string) => {
    let dir = from
    for (;;) {
      const candidate = dir
        ? `${dir}/node_modules/${name}`
        : `node_modules/${name}`
      const real = placed.get(candidate)
      if (real) return { logical: candidate, real }
      if (!dir) return null
      // Step up past this package's `node_modules/<name>` (scoped names have two segments).
      const idx = dir.lastIndexOf('/node_modules/')
      dir = idx === -1 ? '' : dir.slice(0, idx)
    }
  }

  // Breadth-first so shallow dependencies claim the top level. A package's direct dependencies are all placed before
  // any of its descendants are visited, so a later placement can't shadow an earlier resolution.
  const queue: { logical: string; real: string; isRoot: boolean }[] = [
    { logical: '', real: rootDir, isRoot: true },
  ]
  while (queue.length > 0) {
    const { logical, real, isRoot } = queue.shift()!
    const pkg = readPackageJson(real)
    const { required, optional } = depNames(pkg, isRoot)
    const requiredBy = isRoot ? 'package.json' : (pkg.name ?? logical)
    for (const [names, isOptional] of [
      [required, false],
      [optional, true],
    ] as const) {
      for (const name of names) {
        const depReal = resolvePackageDir(name, real)
        if (!depReal) {
          if (!isOptional) missing.push({ name, requiredBy })
          continue
        }
        const found = lookup(name, logical)
        if (found?.real === depReal) continue
        const target = found
          ? `${logical ? `${logical}/` : ''}node_modules/${name}` // another version is visible: nest under requirer
          : `node_modules/${name}` // nothing visible: hoist to the top
        if (placed.has(target)) continue
        placed.set(target, depReal)
        const depPkg = readPackageJson(depReal)
        packages.push({
          name,
          version: depPkg.version ?? '',
          path: target,
          source: depReal,
        })
        queue.push({ logical: target, real: depReal, isRoot: false })
      }
    }
  }

  const files: NodeModulesFile[] = []
  for (const p of packages) {
    const pkg = readPackageJson(p.source)
    const rels = isLinkedSource(p.source)
      ? linkedPackageFiles(p.source, pkg)
      : walkPackage(p.source)
    for (const rel of rels) {
      files.push({
        path: `${p.path}/${rel}`,
        source: join(p.source, ...rel.split('/')),
      })
    }
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  packages.sort((a, b) => (a.path < b.path ? -1 : 1))

  return { files, packages, missing }
}

/** Whether the project's package.json declares any runtime dependencies. */
export const hasRuntimeDependencies = (projectDir: string) => {
  const pkg = readPackageJson(projectDir)
  return (
    Object.keys(pkg.dependencies ?? {}).length +
      Object.keys(pkg.optionalDependencies ?? {}).length >
    0
  )
}
