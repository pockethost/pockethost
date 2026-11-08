import { copyFile, mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import prettyBytes from 'pretty-bytes'
import {
  assertNodeModulesComplete,
  collectLocalFiles,
  describeNodeModules,
  type LocalFile,
} from './deployApi'

export type LocalDeployOptions = {
  include: string[]
  exclude: string[]
  nodeModules?: boolean
  verbose?: boolean
  cwd?: string
  log?: (msg: string) => void
}

/**
 * Writes a deploy set into `outDir` as plain files, exactly as the instance would receive it: logical paths, symlinks
 * resolved to real file contents. `outDir` must be empty or not exist yet.
 */
export const writeDeploySet = async (files: LocalFile[], outDir: string) => {
  const root = resolve(outDir)
  if (existsSync(root) && (await readdir(root)).length > 0) {
    throw new Error(`${outDir} must be empty or not exist yet`)
  }
  await mkdir(root, { recursive: true })
  for (const f of files) {
    const dest = join(root, ...f.path.split('/'))
    await mkdir(dirname(dest), { recursive: true })
    await copyFile(f.source, dest) // copies the target's bytes, never a symlink
  }
  return root
}

const collect = async (opts: LocalDeployOptions) => {
  const log = opts.log ?? console.log
  const { files, skipped, nodeModules } = await collectLocalFiles(
    opts.include,
    opts.exclude,
    opts.cwd ?? process.cwd(),
    { nodeModules: opts.nodeModules }
  )
  if (skipped.length > 0) {
    log(
      `⚠️  Skipping ${skipped.length} file(s) outside the deployable set${opts.verbose ? `: ${skipped.join(', ')}` : ''}`
    )
  }
  for (const line of describeNodeModules(nodeModules)) log(line)
  assertNodeModulesComplete(nodeModules)
  return files
}

const totalBytes = (files: LocalFile[]) =>
  prettyBytes(files.reduce((n, f) => n + f.size, 0))

/** `pockethost deploy --dry-run`: list what would be deployed. */
export const deployDryRun = async (opts: LocalDeployOptions) => {
  const log = opts.log ?? console.log
  const files = await collect(opts)
  for (const f of files) log(`   ${f.path}`)
  log(
    `🧪 Dry run: ${files.length} file(s), ${totalBytes(files)}. Nothing was deployed.`
  )
  return files
}

/** `pockethost deploy --out <dir>`: write the deploy set to a local folder. */
export const deployToDir = async (outDir: string, opts: LocalDeployOptions) => {
  const log = opts.log ?? console.log
  const files = await collect(opts)
  const root = await writeDeploySet(files, outDir)
  if (opts.verbose) for (const f of files) log(`   ${f.path}`)
  log(`📁 Wrote ${files.length} file(s) (${totalBytes(files)}) to ${root}`)
  return files
}
