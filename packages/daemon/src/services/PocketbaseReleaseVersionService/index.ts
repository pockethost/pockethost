import {
  createTimerManager,
  LoggerService,
  mkSingleton,
  SingletonBaseConfig,
} from '@pockethost/common'
import { keys } from '@s-libs/micro-dash'
import { chmodSync, existsSync } from 'fs'
import { glob } from 'glob'
import { basename, join } from 'path'
import { maxSatisfying, rsort } from 'semver'

export type PocketbaseReleaseVersionService = SingletonBaseConfig & {
  cachePath: string
  checkIntervalMs: number
}

export const PocketbaseReleaseVersionService = mkSingleton(
  async (config: PocketbaseReleaseVersionService) => {
    const _serviceLogger = LoggerService().create(
      'PocketbaseReleaseVersionService',
    )
    const { dbg, error, warn, abort } = _serviceLogger

    dbg(`Initializing`)

    const { cachePath, checkIntervalMs } = config

    const binPaths: { [_: string]: string } = {}
    let maxVersion = ''

    const tm = createTimerManager()

    const check = async () => {
      const versions = await glob(join(cachePath, `v*/`))
      versions.forEach((path) => {
        const version = basename(path)
        const sanitizedTagName = version.slice(1)
        dbg(`Found a version ${sanitizedTagName}`)

        const binPath = join(path, `pocketbase`)
        dbg(`Checking ${binPath}`)

        if (existsSync(binPath)) {
          chmodSync(binPath, 0o775)
        }
        binPaths[sanitizedTagName] = binPath
      })
      maxVersion = `~${rsort(keys(binPaths))[0]}`
      dbg({ maxVersion })
      return true
    }
    await check().catch(error)
    tm.repeat(check, checkIntervalMs, false)

    const getLatestVersion = () => maxVersion

    const getVersion = (semVer = maxVersion) => {
      const version = maxSatisfying(keys(binPaths), semVer)
      if (!version)
        throw new Error(
          `No version satisfies ${semVer} (${keys(binPaths).join(', ')})`,
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
    }
  },
)
