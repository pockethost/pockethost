import { InstanceFields, InstanceLogWriterApi, Logger } from '@'
import Bottleneck from 'bottleneck'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export const checkBun = (instance: InstanceFields, virtualPath: string, cwd: string, logger: Logger) => {
  const [subdomain, maybeImportant, ...rest] = virtualPath.split('/').filter((p) => !!p)

  const isImportant =
    maybeImportant === 'patches' ||
    (rest.length === 0 && [`bun.lock`, `bun.lockb`, `package.json`].includes(maybeImportant || ''))

  if (isImportant) {
    logger.info(`${maybeImportant} changed, running bun install`)
    launchBunInstall(instance, virtualPath, cwd, logger).catch(logger.error)
  }
}

const prepPackageJson = (cwd: string, logger: InstanceLogWriterApi) => {
  const packageJsonPath = join(cwd, 'package.json')
  try {
    const packageJson = readFileSync(packageJsonPath, 'utf8')
    const pkg = JSON.parse(packageJson)

    let stripped = false
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        if (typeof version === 'string' && version.startsWith('workspace:')) {
          pkg.dependencies[name] = version.replace('workspace:', '')
          stripped = true
        }
      }
    }
    const stringified = JSON.stringify(pkg, null, 2)
    writeFileSync(packageJsonPath, stringified)
    if (stripped) {
      logger.info(`Stripped workspace dependencies from  package.json`)
      logger.info(JSON.stringify(pkg, null, 2))
    }
  } catch (e) {
    logger.error(`Error parsing package.json: ${e}`)
  }
}

const runBun = (() => {
  const bunLimiter = new Bottleneck({ maxConcurrent: 1 })
  return (cwd: string, logger: InstanceLogWriterApi) =>
    bunLimiter.schedule(
      () =>
        new Promise<number | null>((resolve) => {
          const proc = spawn(
            '/root/.bun/bin/bun',
            ['install', `--no-save`, `--production`, `--ignore-scripts`, `--frozen-lockfile`],
            { cwd }
          )
          const tid = setTimeout(() => {
            logger.error(`bun timeout after 10s`)
            proc.kill()
          }, 10000)
          proc.stdout.on('data', (data) => {
            logger.info(`${data}`)
          })
          proc.stderr.on('data', (data) => {
            logger.error(`${data}`)
          })
          proc.on('close', (code) => {
            logger.info(`bun exited with: ${code}`)
            clearTimeout(tid)
            resolve(code)
          })
        })
    )
})()

const launchBunInstall = (() => {
  const runCache: { [key: string]: { runAgain: boolean } } = {}
  return async (instance: InstanceFields, virtualPath: string, cwd: string, logger: Logger) => {
    if (cwd in runCache) {
      runCache[cwd]!.runAgain = true
      return
    }
    runCache[cwd] = { runAgain: true }
    while (runCache[cwd]!.runAgain) {
      runCache[cwd]!.runAgain = false
      logger.info(`Launching 'bun install' in ${virtualPath}`)
      await prepPackageJson(cwd, logger)
      await runBun(cwd, logger)
    }
    delete runCache[cwd]
  }
})()
