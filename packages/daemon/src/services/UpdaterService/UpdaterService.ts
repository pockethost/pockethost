import { downloadAndExtract, smartFetch } from '$util'
import {
  createCleanupManager,
  createTimerManager,
  mkSingleton,
  SingletonBaseConfig,
} from '@pockethost/common'
import { keys } from '@s-libs/micro-dash'
import { chmodSync, existsSync } from 'fs'
import { type } from 'os'
import { join } from 'path'
import { maxSatisfying, rsort } from 'semver'

export type Release = {
  tag_name: string
  prerelease: string
  assets: {
    name: string
    browser_download_url: string
  }[]
}
export type Releases = Release[]

export type UpdaterServiceConfig = SingletonBaseConfig & {
  cachePath: string
  checkIntervalMs: number
}

export const updaterService = mkSingleton(
  async (config: UpdaterServiceConfig) => {
    const { logger } = config
    const _serviceLogger = logger.create('UpdaterService')
    const { dbg, error, warn, abort } = _serviceLogger

    dbg(`Initializing UpdaterService`)

    const { cachePath, checkIntervalMs } = config

    const cm = createCleanupManager()
    const tm = createTimerManager({})

    const osName = type().toLowerCase()
    const cpuArchitecture = process.arch === 'x64' ? 'amd64' : process.arch

    dbg({ osName, cpuArchitecture })
    const binPaths: { [_: string]: string } = {}
    let maxVersion = ''

    const check = async () => {
      const releases = await smartFetch<Releases>(
        `https://api.github.com/repos/pocketbase/pocketbase/releases?per_page=100`,
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

        const binPath = join(path, `pocketbase`)
        dbg(`Checking ${binPath}`)

        if (existsSync(binPath)) {
          chmodSync(binPath, 0o775)
        } else {
          await downloadAndExtract(url, binPath, _serviceLogger)
        }
        binPaths[sanitizedTagName] = binPath
      })
      await Promise.all(promises)
      if (keys(binPaths).length === 0) {
        throw new Error(
          `No version found, probably mismatched architecture and OS (${osName}/${cpuArchitecture})`
        )
      }
      maxVersion = `~${rsort(keys(binPaths))[0]}`
      dbg({ maxVersion })
      return true
    }
    await check().catch(abort)

    tm.repeat(check, checkIntervalMs)

    const getLatestVersion = () => maxVersion

    const getVersion = async (semVer = maxVersion) => {
      const version = maxSatisfying(keys(binPaths), semVer)
      if (!version)
        throw new Error(
          `No version satisfies ${semVer} (${keys(binPaths).join(', ')})`
        )
      const binPath = binPaths[version]
      if (!binPath) throw new Error(`binPath for ${version} not found`)
      return {
        version,
        binPath,
      }
    }

    return {
      getLatestVersion,
      getVersion,
      shutdown: async () => {},
    }
  }
)
