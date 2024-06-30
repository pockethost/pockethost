import { Mutex } from 'async-mutex'
import fs, { mkdirSync } from 'fs'
import getPort from 'get-port'
import { globSync } from 'glob'
import { gobot } from 'gobot'
import path from 'path'
import {
  Bind,
  InstanceFields,
  doAfterInstanceStartedAction,
  doAfterInstanceStoppedAction,
  doInstanceConfigFilter,
  doInstanceLogAction,
  onKillInstanceAction,
} from 'pockethost'
import { INSTANCE_DATA_DIR, exitHook, tryFetch } from 'pockethost/core'
import { gte } from 'semver'
import { dbg } from './log'

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

const launchMutex = new Mutex()

export const mkLauncher = (instance: InstanceFields) => {
  const { dev, subdomain, version, secrets } = instance
  return new Promise<string>(async (resolve, reject) => {
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
        data: `Launching: ${await bot.getBinaryFilePath()} ${args.join(' ')}`,
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

        const unsubKillAction = onKillInstanceAction(async (context) => {
          dbg(`kill action`, { context, instance })
          if (context.instance.id !== instance.id) return
          kill()
        })

        const kill = () => {
          dbg(`killing ${subdomain}`)
          doInstanceLogAction({
            instance,
            type: 'stdout',
            data: `Forcibly killing PocketBase process`,
          })
          proc.kill()
        }

        const unsubExitHook = exitHook(kill)
        const unsub = () => {
          unsubExitHook()
          unsubKillAction()
        }
        proc.on('exit', (code) => {
          unsub()
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
  })
}
