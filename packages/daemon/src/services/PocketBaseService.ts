import { DAEMON_PB_DATA_DIR } from '$constants'
import {
  downloadAndExtract,
  mkInternalAddress,
  mkInternalUrl,
  smartFetch,
  tryFetch,
} from '$util'
import {
  createCleanupManager,
  createTimerManager,
  logger,
  safeCatch,
} from '@pockethost/common'
import { mkSingleton } from '@pockethost/common/src/mkSingleton'
import { keys } from '@s-libs/micro-dash'
import { spawn } from 'child_process'
import { chmodSync, existsSync } from 'fs'
import getPort from 'get-port'
import { type } from 'os'
import { join } from 'path'
import { maxSatisfying, rsort } from 'semver'
import { AsyncReturnType } from 'type-fest'

export type PocketbaseCommand = 'serve' | 'upgrade'
export type SpawnConfig = {
  command: PocketbaseCommand
  slug: string
  version?: string
  port?: number
  onUnexpectedStop?: (code: number | null) => void
}
export type PocketbaseServiceApi = AsyncReturnType<
  typeof createPocketbaseService
>

export type PocketbaseServiceConfig = {
  cachePath: string
  checkIntervalMs: number
}

export type PocketbaseProcess = {
  url: string
  pid: number | undefined
  kill: () => boolean
  exited: Promise<number | null>
}

export type Release = {
  tag_name: string
  prerelease: string
  assets: {
    name: string
    browser_download_url: string
  }[]
}
export type Releases = Release[]

export const createPocketbaseService = async (
  config: PocketbaseServiceConfig
) => {
  const { dbg, error } = logger().create('PocketbaseService')

  const { cachePath, checkIntervalMs } = config

  const cm = createCleanupManager()
  const tm = createTimerManager({})

  const osName = type().toLowerCase()
  const cpuArchitecture = process.arch === 'x64' ? 'amd64' : process.arch

  dbg({ osName, cpuArchitecture })
  const versions: { [_: string]: Promise<string> } = {}
  let maxVersion = ''

  const check = async () => {
    const releases = await smartFetch<Releases>(
      `https://api.github.com/repos/pocketbase/pocketbase/releases`,
      join(cachePath, `releases.json`)
    )
    // dbg({ releases })

    const promises = releases.map(async (release) => {
      const { tag_name, prerelease, assets } = release
      const sanitizedTagName = tag_name.slice(1)
      if (prerelease) return
      const path = join(cachePath, tag_name)
      const url = assets.find((v) => {
        // dbg(v.name)
        return v.name.includes(osName) && v.name.includes(cpuArchitecture)
      })?.browser_download_url
      if (!url) return

      const p = new Promise<string>(async (resolve) => {
        const binPath = join(path, `pocketbase`)
        if (existsSync(binPath)) {
          chmodSync(binPath, 0o775)
          resolve(binPath)
          versions[sanitizedTagName] = Promise.resolve('')
          return
        }
        await downloadAndExtract(url, binPath)

        resolve(binPath)
      })
      versions[sanitizedTagName] = p
    })
    await Promise.all(promises).catch((e) => {
      error(e)
    })
    if (keys(versions).length === 0) {
      throw new Error(
        `No version found, probably mismatched architecture and OS (${osName}/${cpuArchitecture})`
      )
    }
    maxVersion = `~${rsort(keys(versions))[0]}`
    dbg({ maxVersion })
    return true
  }
  await check().catch(error)

  tm.repeat(check, checkIntervalMs)

  const getLatestVersion = () => maxVersion

  const getVersion = async (semVer = maxVersion) => {
    const version = maxSatisfying(keys(versions), semVer)
    if (!version) throw new Error(`No version satisfies ${semVer}`)
    const binPath = await versions[version]
    if (!binPath) throw new Error(`binPath for ${version} not found`)
    return {
      version,
      binPath,
    }
  }

  const _spawn = safeCatch(`spawnInstance`, async (cfg: SpawnConfig) => {
    const _cfg: Required<SpawnConfig> = {
      version: '~0.11.0',
      port: await getPort(),
      onUnexpectedStop: (code) => {
        dbg(`Unexpected stop default handler. Exit code: ${code}`)
      },
      ...cfg,
    }
    const { version, command, slug, port, onUnexpectedStop } = _cfg
    const bin = (await getVersion(version)).binPath
    if (!existsSync(bin)) {
      throw new Error(
        `PocketBase binary (${bin}) not found. Contact pockethost.io.`
      )
    }

    const args = [
      command,
      `--dir`,
      `${DAEMON_PB_DATA_DIR}/${slug}/pb_data`,
      `--publicDir`,
      `${DAEMON_PB_DATA_DIR}/${slug}/pb_static`,
    ]
    if (command === 'serve') {
      args.push(`--http`)
      args.push(mkInternalAddress(port))
    }
    dbg(`Spawning ${slug}`, { bin, args })
    const ls = spawn(bin, args)
    cm.add(() => ls.kill())

    ls.stdout.on('data', (data) => {
      dbg(`${slug} stdout: ${data}`)
    })

    ls.stderr.on('data', (data) => {
      error(`${slug} stderr: ${data}`)
    })

    ls.on('close', (code) => {
      dbg(`${slug} closed with code ${code}`)
    })

    const exited = new Promise<number | null>((resolve) => {
      ls.on('exit', (code) => {
        dbg(`${slug} exited with code ${code}`)
        if (code) onUnexpectedStop?.(code)
        resolve(code)
      })
    })

    ls.on('error', (err) => {
      dbg(`${slug} had error ${err}`)
    })

    const url = mkInternalUrl(port)
    if (command === 'serve') {
      await tryFetch(url)
    }
    const api: PocketbaseProcess = {
      url,
      exited,
      pid: ls.pid,
      kill: () => ls.kill(),
    }
    return api
  })

  const shutdown = () => {
    dbg(`Shutting down pocketbaseService`)
    tm.shutdown()
    cm.shutdown()
  }

  return {
    spawn: _spawn,
    getVersion,
    getLatestVersion,
    shutdown,
  }
}

export const pocketbase = mkSingleton(createPocketbaseService)
