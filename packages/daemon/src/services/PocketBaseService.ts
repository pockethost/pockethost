import { createTimerManager } from '@pockethost/common'
import { keys } from '@s-libs/micro-dash'
import { spawn } from 'child_process'
import { chmodSync, existsSync } from 'fs'
import getPort from 'get-port'
import fetch from 'node-fetch'
import { type } from 'os'
import { dirname, join } from 'path'
import { maxSatisfying, rsort } from 'semver'
import { AsyncReturnType } from 'type-fest'
import { Extract } from 'unzipper'
import { DAEMON_PB_DATA_DIR } from '../constants'
import { mkInternalAddress, mkInternalUrl } from '../util/internal'
import { dbg, error } from '../util/logger'
import { safeCatch } from '../util/promiseHelper'
import { tryFetch } from '../util/tryFetch'
import { mkSingleton } from './mkSingleton'

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
  kill: () => void
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

export const downloadAndExtract = async (url: string, binPath: string) => {
  await new Promise<void>(async (resolve, reject) => {
    console.log(`Fetching ${url}`)
    const res = await fetch(url)
    if (!res.body) {
      throw new Error(`Body expected for ${url}`)
    }
    console.log(`Extracting ${url}`)
    const stream = res.body.pipe(Extract({ path: dirname(binPath) }))
    stream.on('close', () => {
      console.log(`Close ${url}`)
      resolve()
    })
    stream.on('error', (e) => {
      console.error(`Error ${url} ${e}`)
      reject()
    })
    stream.on('end', () => {
      console.log(`End ${url}`)
      resolve()
    })
  })
  chmodSync(binPath, 0o775)
}

export const createPocketbaseService = async (
  config: PocketbaseServiceConfig
) => {
  const { cachePath, checkIntervalMs } = config

  const tm = createTimerManager({})

  const osName = type().toLowerCase()
  const cpuArchitecture = process.arch

  console.log({ osName, cpuArchitecture })
  const versions: { [_: string]: Promise<string> } = {}
  let maxVersion = ''

  const check = async () => {
    const res = await fetch(
      `https://api.github.com/repos/pocketbase/pocketbase/releases`
    )
    const releases = (await res.json()) as Releases

    const promises = releases.map(async (release) => {
      const { tag_name, prerelease, assets } = release
      const sanitizedTagName = tag_name.slice(1)
      if (prerelease) return
      const path = join(cachePath, tag_name)
      const url = assets.find(
        (v) => v.name.includes(osName) && v.name.includes(cpuArchitecture)
      )?.browser_download_url
      if (!url) return

      const p = new Promise<string>(async (resolve) => {
        const binPath = join(path, `pocketbase`)
        if (existsSync(binPath)) {
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
      console.error(e)
    })
    maxVersion = `^${rsort(keys(versions))[0]}`
    return true
  }
  await check()
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
    const { version, command, slug, port, onUnexpectedStop }: SpawnConfig = {
      version: '^0.10.0',
      port: await getPort(),
      ...cfg,
    }
    const bin = (await getVersion(version)).binPath
    if (!existsSync(bin)) {
      throw new Error(
        `PocketBase binary (${bin}) not found. Contact pockethost.io.`
      )
    }

    const args = [command, `--dir`, `${DAEMON_PB_DATA_DIR}/${slug}/pb_data`]
    if (command === 'serve') {
      args.push(`--http`)
      args.push(mkInternalAddress(port))
    }
    dbg(`Spawning ${slug}`, { bin, args })
    const ls = spawn(bin, args)

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
        onUnexpectedStop?.(code)
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
  }

  return {
    spawn: _spawn,
    getVersion,
    getLatestVersion,
    shutdown,
  }
}

export const pocketbase = mkSingleton(createPocketbaseService)
