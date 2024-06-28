import { Mutex } from 'async-mutex'
import fs, { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import getPort from 'get-port'
import { globSync } from 'glob'
import { gobot } from 'gobot'
import path from 'path'
import {
  Bind,
  InstanceFields,
  PocketHostPlugin,
  doAfterInstanceStartedAction,
  doAfterInstanceStoppedAction,
  doInstanceConfigFilter,
  doInstanceLogAction,
  mkInstance,
  onAfterInstanceFoundAction,
  onAfterServerStartAction,
  onGetInstanceByRequestInfoFilter,
  onGetOrProvisionInstanceUrlFilter,
  onNewInstanceRecordFilter,
} from 'pockethost'
import {
  APEX_DOMAIN,
  INSTANCE_DATA_DIR,
  PORT,
  exitHook,
  tryFetch,
} from 'pockethost/core'
import { gte } from 'semver'
import { PLUGIN_NAME } from './constants'
import { dbg, info } from './log'

const deleteFiles = (globPattern: string) => {
  const files = globSync(globPattern)
  files.forEach((file) => {
    dbg(`Deleting ${file}`)
    fs.unlinkSync(file)
  })
}

const copyFiles = (binds: Bind[], destination: string) => {
  binds.forEach((bind) => {
    const srcFiles = globSync(bind.src)
    srcFiles.forEach((srcFile) => {
      const relativePath = path.relative(bind.base, srcFile)
      const destFile = path.join(destination, relativePath)
      const destDir = path.dirname(destFile)
      dbg(`Copying ${srcFile} to ${destFile}`, { relativePath, destDir, bind })

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      fs.copyFileSync(srcFile, destFile)
    })
  })
}

const escape = (path: string) => `"${path}"`

const metaPath = (name: string) => {
  const instanceRootDir = INSTANCE_DATA_DIR(name)
  mkdirSync(instanceRootDir, { recursive: true })
  const instanceMetaFile = INSTANCE_DATA_DIR(name, `meta.json`)
  return instanceMetaFile
}

const readMeta = (path: string) =>
  JSON.parse(readFileSync(path, 'utf-8').toString())

const getOrCreateMeta = async (name: string) => {
  const instanceMetaFile = metaPath(name)
  const meta = await (async () => {
    if (!existsSync(instanceMetaFile)) {
      const meta = await mkInstance(name)
      writeFileSync(instanceMetaFile, JSON.stringify(meta, null, 2))
    }
    const meta = readMeta(instanceMetaFile)
    return meta
  })()
  return meta
}

const writeMeta = async (instance: InstanceFields) => {
  const { subdomain } = instance
  const instanceMetaFile = metaPath(subdomain)
  writeFileSync(instanceMetaFile, JSON.stringify(instance, null, 2))
}

const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  /** Display some informational alerts to help the user get started. */
  onAfterServerStartAction(async () => {
    const protocol = PORT() === 443 ? 'https' : 'http'
    {
      const url = new URL(`${protocol}://*.${APEX_DOMAIN()}`)
      url.port = `${PORT() === 80 || PORT() == 443 ? '' : PORT()}`
      info(`Listening for requests on ${url}`)
    }
    {
      const url = new URL(`${protocol}://hello.${APEX_DOMAIN()}`)
      url.port = `${PORT() === 80 || PORT() == 443 ? '' : PORT()}`
      info(`Try visiting ${url}`)
    }
  })

  /** When a request comes in, return an instance based on subdomain */
  onGetInstanceByRequestInfoFilter(async (instance, context) => {
    const { subdomain } = context
    const meta = await getOrCreateMeta(subdomain)
    return { ...instance, ...meta }
  })

  /**
   * When a new instance model is instantiated, this filter gives listeners a
   * chance to augment or update the instance data.
   *
   * In this case, the instance data is restored from a local db.
   */
  onNewInstanceRecordFilter(async (instance) => {
    const { subdomain } = instance
    const path = metaPath(subdomain)
    if (!existsSync(path)) return instance
    const meta = await readMeta(path)
    return { ...instance, ...meta }
  })

  /** After an instance has been found, store it to the db */
  onAfterInstanceFoundAction(async (context) => {
    const { instance } = context
    await writeMeta(instance)
  })

  const instances: { [_: string]: Promise<string> } = {}

  const launchMutex = new Mutex()

  /**
   * The workhorse. This filter is responsible for launching PocketBase and
   * returning an endpoint URL.
   */
  onGetOrProvisionInstanceUrlFilter(async (url: string, { instance }) => {
    const { dev, subdomain, version, secrets } = instance

    if (subdomain in instances) return instances[subdomain]!

    dbg({ instance })
    return (instances[subdomain] = new Promise<string>(
      async (resolve, reject) => {
        const bot = await gobot(`pocketbase`, { version })
        const realVersion = await bot.maxSatisfyingVersion(version)
        if (!realVersion) {
          throw new Error(`No PocketBase version satisfying ${version}`)
        }

        const instanceConfig = await doInstanceConfigFilter({
          env: {},
          binds: {
            data: [],
            hooks: [],
            migrations: [],
            public: [],
          },
        })

        dbg(`instanceConfig`, { instanceConfig })

        const dataDir = INSTANCE_DATA_DIR(subdomain, `pb_data`)
        const hooksDir = INSTANCE_DATA_DIR(subdomain, `pb_hooks`)
        const migrationsDir = INSTANCE_DATA_DIR(subdomain, `pb_migrations`)
        const publicDir = INSTANCE_DATA_DIR(subdomain, `pb_public`)

        ;[dataDir, hooksDir, migrationsDir, publicDir].forEach((dir) => {
          return mkdirSync(dir, { recursive: true })
        })
        const { binds, env } = instanceConfig
        copyFiles(binds.data, dataDir)
        copyFiles(binds.hooks, hooksDir)
        copyFiles(binds.migrations, migrationsDir)
        copyFiles(binds.public, publicDir)

        return launchMutex.runExclusive(async () => {
          dbg(`got lock`)
          const port = await getPort()
          const args = [
            `serve`,
            `--dir`,
            escape(dataDir),
            `--hooksDir`,
            escape(hooksDir),
            `--migrationsDir`,
            escape(migrationsDir),
            `--publicDir`,
            escape(publicDir),
            `--http`,
            `0.0.0.0:${port}`,
          ]
          if (dev && gte(realVersion, `0.20.1`)) args.push(`--dev`)
          doInstanceLogAction({
            instance,
            type: 'stdout',
            data: `Launching: ${await bot.getBinaryFilePath()} ${args.join(
              ' ',
            )}`,
          })
          bot.run(args, { env: { ...secrets, ...env } }, (proc) => {
            proc.stdout.on('data', (data) => {
              data
                .toString()
                .trim()
                .split(`\n`)
                .forEach((line: string) => {
                  doInstanceLogAction({
                    instance,
                    type: 'stdout',
                    data: line,
                  })
                })
            })
            proc.stderr.on('data', (data) => {
              data
                .toString()
                .trim()
                .split(`\n`)
                .forEach((line: string) => {
                  doInstanceLogAction({
                    instance,
                    type: 'stderr',
                    data: line,
                  })
                })
            })

            const unsub = exitHook(() => {
              dbg(`killing ${subdomain}`)
              doInstanceLogAction({
                instance,
                type: 'stdout',
                data: `Forcibly killing PocketBase process`,
              })
              proc.kill()
            })
            proc.on('exit', (code) => {
              unsub()
              delete instances[subdomain]
              doInstanceLogAction({
                instance,
                type: 'stdout',
                data: `PocketBase process exited with code ${code}`,
              })
              doAfterInstanceStoppedAction({ instance, url })
              dbg(`${subdomain} process exited with code ${code}`)
            })
            const url = `http://localhost:${port}`
            doInstanceLogAction({
              instance,
              type: 'stdout',
              data: `Waiting for PocketBase to start on ${url}`,
            })
            tryFetch(url)
              .then(() => {
                doInstanceLogAction({
                  instance,
                  type: 'stdout',
                  data: `PocketBase started on ${url}`,
                })
                doAfterInstanceStartedAction({ instance, url })
                return resolve(url)
              })
              .catch((e) => {
                doInstanceLogAction({
                  instance,
                  type: 'stderr',
                  data: `PocketBase failed to start on ${url}: ${e}`,
                })
                reject(e)
              })
          })
        })
      },
    ))
  })
}

export default plugin
