import { PH_BIN_CACHE, PH_VERSIONS } from '$constants'
import { LoggerService, SingletonBaseConfig, mkSingleton } from '$shared'
import { downloadAndExtract, mergeConfig, smartFetch } from '$util'
import { keys } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { chmodSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { rsort } from 'semver'
import { expandAndSortSemVers } from './expandAndSortSemVers'

type Release = {
  url: string
  tag_name: string
  prerelease: string
  assets: {
    name: string
    browser_download_url: string
  }[]
}
type Releases = Release[]

export type PocketbaseReleaseDownloadServiceConfig = SingletonBaseConfig & {
  onlyOne: boolean
  binCachePath: string
  versionsCachePath: string
}

export const PocketbaseReleaseDownloadService = mkSingleton(
  (config: Partial<PocketbaseReleaseDownloadServiceConfig> = {}) => {
    const { binCachePath, versionsCachePath, onlyOne } = mergeConfig(
      {
        binCachePath: PH_BIN_CACHE(),
        versionsCachePath: PH_VERSIONS(),
        onlyOne: false,
      },
      config,
    )

    const _serviceLogger = LoggerService().create(
      'PocketbaseReleaseDownloadService',
    )
    const { dbg, info, error, warn, abort } = _serviceLogger

    dbg(`Initializing`)

    const osName = 'linux' // type().toLowerCase()
    const cpuArchitecture = process.arch === 'x64' ? 'amd64' : process.arch

    dbg({ osName, cpuArchitecture })
    const binPaths: { [_: string]: string } = {}
    let maxVersion = ''

    const check = async () => {
      info(`Fetching info for PocketBase releases...`)
      let releases = await smartFetch<Releases>(
        `https://api.github.com/repos/pocketbase/pocketbase/releases?per_page=100`,
        join(binCachePath, `releases.json`),
      )
      // dbg({ releases })

      type Defined<T> = Exclude<T, undefined>

      type NoUndefinedProperties<T> = {
        [K in keyof T]: Defined<T[K]>
      }

      const filteredReleases = releases
        .filter((release) => !release.prerelease)
        .map((release) => {
          const { tag_name, assets } = release
          const sanitizedTagName = tag_name.slice(1)
          const path = join(binCachePath, tag_name)
          const url = assets.find((v) => {
            // dbg(v.name)
            return v.name.includes(osName) && v.name.includes(cpuArchitecture)
          })?.browser_download_url
          return { url, sanitizedTagName, path }
        })
        .filter(
          (release): release is NoUndefinedProperties<typeof release> =>
            !!release.url,
        )

      if (filteredReleases.length === 0) return

      const limiter = new Bottleneck({ maxConcurrent: 5 })

      const promises = (
        onlyOne ? [filteredReleases[0]!] : filteredReleases
      ).map((release) =>
        limiter.schedule(async () => {
          const { url, sanitizedTagName, path } = release
          const binPath = join(path, `pocketbase`)
          info(`Checking ${binPath}`)

          if (existsSync(binPath)) {
            chmodSync(binPath, 0o775)
          } else {
            info(`Downloading ${url}...`)
            await downloadAndExtract(url, binPath, _serviceLogger)
          }
          binPaths[sanitizedTagName] = binPath
        }),
      )
      await Promise.all(promises)

      console.log(`***keys`, keys(binPaths))
      const sortedSemVers = expandAndSortSemVers(keys(binPaths))
      writeFileSync(
        versionsCachePath,
        `module.exports = ${JSON.stringify({ versions: sortedSemVers })}`,
      )
      info(`Saved to ${versionsCachePath}`, sortedSemVers)

      if (keys(binPaths).length === 0) {
        throw new Error(
          `No version found, probably mismatched architecture and OS (${osName}/${cpuArchitecture})`,
        )
      }
      maxVersion = `~${rsort(keys(binPaths))[0]}`
      info(`Highest PocketBase version is ${maxVersion}`)
    }

    return {
      check,
    }
  },
)
