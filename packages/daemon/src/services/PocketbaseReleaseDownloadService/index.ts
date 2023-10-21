import { downloadAndExtract, smartFetch } from '$util'
import {
  LoggerService,
  SingletonBaseConfig,
  mkSingleton,
} from '@pockethost/common'
import { keys } from '@s-libs/micro-dash'
import { chmodSync, existsSync } from 'fs'
import { join } from 'path'
import { rsort } from 'semver'

type Release = {
  tag_name: string
  prerelease: string
  assets: {
    name: string
    browser_download_url: string
  }[]
}
type Releases = Release[]

export type PocketbaseReleaseDownloadServiceConfig = SingletonBaseConfig & {
  cachePath: string
}

export const PocketbaseReleaseDownloadService = mkSingleton(
  (config: PocketbaseReleaseDownloadServiceConfig) => {
    const _serviceLogger = LoggerService().create(
      'PocketbaseReleaseDownloadService',
    )
    const { dbg, info, error, warn, abort } = _serviceLogger

    dbg(`Initializing`)

    const { cachePath } = config

    const osName = 'linux' // type().toLowerCase()
    const cpuArchitecture = process.arch === 'x64' ? 'amd64' : process.arch

    dbg({ osName, cpuArchitecture })
    const binPaths: { [_: string]: string } = {}
    let maxVersion = ''

    const check = async () => {
      const releases = await smartFetch<Releases>(
        `https://api.github.com/repos/pocketbase/pocketbase/releases?per_page=100`,
        join(cachePath, `releases.json`),
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
