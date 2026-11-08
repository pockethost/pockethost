import { Command } from 'commander'
import { existsSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve, sep } from 'path'
import prettyBytes from 'pretty-bytes'
import { savedInstanceName } from '../lib/defaultInstanceId'
import {
  createFilesClient,
  normalizeRemotePath,
  type RemoteEntry,
} from '../lib/filesApi'

const DATA_DIR = 'pb_data'
const NODE_MODULES = 'node_modules'
const UPLOAD_CONCURRENCY = 8

const hasNodeModules = (p: string) => p.split('/').includes(NODE_MODULES)

const requireInstance = (instance?: string) => {
  const name = instance || savedInstanceName()
  if (!name)
    throw new Error(
      `No instance given and none linked. Pass --instance <name> or run 'pockethost link <instance>'.`
    )
  return name
}

const instanceOption = (cmd: Command) =>
  cmd.option(
    '-I, --instance <name>',
    'Instance name (defaults to the linked instance)'
  )

const dataHint = (e: unknown) => {
  const msg = (e as Error)?.message ?? `${e}`
  return /power off/i.test(msg)
    ? `${msg} Power it off in the dashboard, run this again, then power it back on.`
    : msg
}

const fmtDate = (ms: number) =>
  new Date(ms).toISOString().replace('T', ' ').slice(0, 16)

/** `pockethost files [path]` */
export const FilesCommand = () =>
  instanceOption(
    new Command('files')
      .alias('ls-files')
      .description(
        'List files on your instance (pb_hooks, pb_migrations, pb_public, pb_data, ...)'
      )
      .argument('[path]', 'Folder or file on the instance', '')
      .option('-r, --recursive', 'List everything below the folder')
      .option('--json', 'Print JSON')
  ).action(async (path: string, options) => {
    const files = await createFilesClient(requireInstance(options.instance))
    const out = await files.list(path, !!options.recursive).catch((e) => {
      throw new Error(dataHint(e))
    })
    if (options.json) {
      console.log(JSON.stringify(out.entries, null, 2))
      return
    }
    if (out.entries.length === 0) console.log(`(empty)`)
    for (const e of out.entries) {
      const size = e.isDirectory ? '-' : prettyBytes(e.size)
      console.log(
        `${fmtDate(e.mtime)}  ${size.padStart(10)}  ${e.path}${e.isDirectory ? '/' : ''}`
      )
    }
    if (out.truncated) console.log(`(list truncated)`)
  })

/** True when the local copy already matches (same size and mtime, which pull sets). */
const isCurrent = (local: string, e: RemoteEntry) => {
  if (!existsSync(local)) return false
  const st = statSync(local)
  return st.size === e.size && Math.abs(st.mtimeMs - e.mtime) < 1000
}

/** `pockethost pull [paths...]` */
export const PullCommand = () =>
  instanceOption(
    new Command('pull')
      .description(
        'Download files from your instance into this folder. Default: everything except pb_data'
      )
      .argument(
        '[paths...]',
        'Files or folders on the instance (e.g. pb_hooks pb_data/backups)'
      )
      .option('--data', 'Include pb_data (the instance must be powered off)')
      .option('-d, --dir <dir>', 'Local folder to download into', '.')
      .option('-n, --dry-run', 'Show what would be downloaded')
      .option('-v, --verbose', 'Print every file')
  ).action(async (paths: string[], options) => {
    const instanceName = requireInstance(options.instance)
    const files = await createFilesClient(instanceName)
    const dir = resolve(options.dir)

    let roots = paths.map((p) => normalizeRemotePath(p)).filter(Boolean)
    if (roots.length === 0) {
      const top = await files.list('')
      roots = top.entries
        .map((e) => e.path)
        .filter((p) => (options.data || p !== DATA_DIR) && p !== NODE_MODULES)
      if (!options.data && top.entries.some((e) => e.path === DATA_DIR))
        console.log(`Skipping pb_data (add --data to include it).`)
      if (top.entries.some((e) => e.path === NODE_MODULES))
        console.log(
          `Skipping node_modules (run 'pockethost pull node_modules' if you need it).`
        )
    }

    const wanted: RemoteEntry[] = []
    for (const root of roots) {
      const { entries } = await files.list(root, true).catch((e) => {
        throw new Error(`${root}: ${dataHint(e)}`)
      })
      wanted.push(
        ...entries.filter(
          (e) =>
            !e.isDirectory && (hasNodeModules(root) || !hasNodeModules(e.path))
        )
      )
    }

    const todo = wanted.filter((e) => !isCurrent(join(dir, e.path), e))
    const bytes = todo.reduce((n, e) => n + e.size, 0)
    console.log(
      `${options.dryRun ? 'Would download' : 'Downloading'} ${todo.length} of ${wanted.length} file(s) (${prettyBytes(bytes)}) from ${instanceName} into ${dir}`
    )
    for (const e of todo) {
      if (options.verbose || options.dryRun) console.log(`   ${e.path}`)
      if (!options.dryRun) await files.download(e.path, join(dir, e.path))
    }
    if (!options.dryRun) console.log(`✅ Done.`)
  })

const walkLocal = (abs: string): string[] => {
  const st = statSync(abs)
  if (!st.isDirectory()) return [abs]
  return readdirSync(abs)
    .filter((n) => !n.startsWith('.git'))
    .flatMap((n) => walkLocal(join(abs, n)))
}

/** `pockethost upload <local> [remote]` */
export const UploadCommand = () =>
  instanceOption(
    new Command('upload')
      .description(
        'Upload a file or folder to your instance, e.g. an existing pb_data or node_modules. Writing to pb_data needs the instance powered off'
      )
      .argument('<local>', 'Local file or folder')
      .argument(
        '[remote]',
        'Where to put it on the instance (defaults to the same relative path, e.g. pb_data/data.db)'
      )
      .option('-v, --verbose', 'Print every file')
  ).action(async (local: string, remote: string | undefined, options) => {
    const instanceName = requireInstance(options.instance)
    const abs = resolve(local)
    if (!existsSync(abs)) throw new Error(`${local} not found`)
    const target = normalizeRemotePath(
      remote ?? relative(process.cwd(), abs).split(sep).join('/')
    )
    if (!target || target.startsWith('..'))
      throw new Error(
        `Give a remote path, e.g. 'pockethost upload ${local} pb_data/data.db'`
      )
    const files = await createFilesClient(instanceName)
    const all = walkLocal(abs)
    const total = all.reduce((n, f) => n + statSync(f).size, 0)
    console.log(
      `⬆️  Uploading ${all.length} file(s) (${prettyBytes(total)}) to ${instanceName}:${target}`
    )
    let next = 0
    let done = 0
    const worker = async () => {
      while (next < all.length) {
        const f = all[next++]!
        const rel = relative(abs, f).split(sep).join('/')
        const dest = rel ? `${target}/${rel}` : target
        await files.upload(f, dest).catch((e) => {
          next = all.length // stop the other workers
          throw new Error(`${dest}: ${dataHint(e)}`)
        })
        done++
        if (options.verbose) console.log(`   ${dest}`)
        else if (all.length > 50 && done % 250 === 0)
          console.log(`   ${done}/${all.length}`)
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, all.length) }, worker)
    )
    console.log(`✅ Done.`)
  })

/** `pockethost rm <paths...>` */
export const RmCommand = () =>
  instanceOption(
    new Command('rm')
      .description(
        'Delete files on your instance, e.g. a migration that keeps it from starting'
      )
      .argument('<paths...>', 'Files or folders on the instance')
      .option('-r, --recursive', 'Delete folders and everything in them')
  ).action(async (paths: string[], options) => {
    const instanceName = requireInstance(options.instance)
    const files = await createFilesClient(instanceName)
    for (const p of paths) {
      await files.remove(p, !!options.recursive).catch((e) => {
        throw new Error(`${p}: ${dataHint(e)}`)
      })
      console.log(`🗑️  Deleted ${instanceName}:${normalizeRemotePath(p)}`)
    }
  })
