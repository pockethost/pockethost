import { compact, map } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { spawn } from 'child_process'
import { Mode, constants, createReadStream, createWriteStream } from 'fs'
import { FileStat, FileSystem, FtpConnection } from 'ftp-srv'
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'path'
import {
  InstanceFields,
  Logger,
  PocketBase,
  assert,
  newId,
} from '../../../../../common'
import { DATA_ROOT } from '../../../../../core'
import { InstanceLogger, InstanceLoggerApi } from '../../../../../services'
import * as fsAsync from './fs-async'
import { MAINTENANCE_ONLY_INSTANCE_ROOTS } from './guards'

export type PathError = {
  cause: {
    errno: number
    code: string
    syscall: string
    path: string
  }
  isOperational: boolean
  errno: number
  code: string
  syscall: string
  path: string
}

const UNIX_SEP_REGEX = /\//g
const WIN_SEP_REGEX = /\\/g

const checkBun = (
  instance: InstanceFields,
  virtualPath: string,
  cwd: string,
) => {
  const [subdomain, maybeImportant, ...rest] = virtualPath
    .split('/')
    .filter((p) => !!p)

  const isImportant =
    maybeImportant === 'patches' ||
    (rest.length === 0 &&
      [`bun.lockb`, `package.json`].includes(maybeImportant || ''))

  if (isImportant) {
    const logger = InstanceLogger(instance.id, `exec`, { ttl: 5000 })
    logger.info(`${maybeImportant} changed, running bun install`)
    launchBunInstall(instance, virtualPath, cwd).catch(console.error)
  }
}

const runBun = (() => {
  const bunLimiter = new Bottleneck({ maxConcurrent: 1 })
  return (cwd: string, logger: InstanceLoggerApi) =>
    bunLimiter.schedule(
      () =>
        new Promise<number | null>((resolve) => {
          const proc = spawn(
            '/root/.bun/bin/bun',
            [
              'install',
              `--no-save`,
              `--production`,
              `--ignore-scripts`,
              `--frozen-lockfile`,
            ],
            { cwd },
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
        }),
    )
})()

const launchBunInstall = (() => {
  const runCache: { [key: string]: { runAgain: boolean } } = {}
  return async (instance: InstanceFields, virtualPath: string, cwd: string) => {
    if (cwd in runCache) {
      runCache[cwd]!.runAgain = true
      return
    }
    runCache[cwd] = { runAgain: true }
    while (runCache[cwd]!.runAgain) {
      runCache[cwd]!.runAgain = false
      const logger = InstanceLogger(instance.id, `exec`)
      logger.info(`Launching 'bun install' in ${virtualPath}`)
      await runBun(cwd, logger)
    }
    delete runCache[cwd]
  }
})()

export class PhFs implements FileSystem {
  private log: Logger
  connection: FtpConnection
  cwd: string
  private _root: string
  client: PocketBase

  constructor(connection: FtpConnection, client: PocketBase, logger: Logger) {
    const cwd = `/`
    const root = DATA_ROOT()
    this.connection = connection
    this.client = client
    this.log = logger.create(`PhFs`)
    this.cwd = normalize((cwd || '/').replace(WIN_SEP_REGEX, '/'))
    this._root = resolve(root || process.cwd())
  }

  get root() {
    return this._root
  }

  async _resolvePath(virtualPath = '.') {
    const { dbg } = this.log.create(`_resolvePath`)

    // Unix separators normalize nicer on both unix and win platforms
    const resolvedVirtualPath = virtualPath.replace(WIN_SEP_REGEX, '/')

    // Join cwd with new path
    const finalVirtualPath = isAbsolute(resolvedVirtualPath)
      ? normalize(resolvedVirtualPath)
      : join('/', this.cwd, resolvedVirtualPath)

    console.log(`***finalVirtualPath`, { finalVirtualPath })
    // Create local filesystem path using the platform separator
    const [empty, subdomain, ...restOfVirtualPath] = finalVirtualPath.split('/')
    dbg({
      finalVirtualPath,
      subdomain,
      restOfVirtualPath,
    })

    // Begin building the physical path
    const fsPathParts: string[] = [this._root]

    // Check if the instance is valid
    const instance = await (async () => {
      console.log(`***checking validity`, { subdomain })
      if (!subdomain) return
      const instance = await this.client
        .collection(`instances`)
        .getFirstListItem<InstanceFields>(`subdomain='${subdomain}'`)
      if (!instance) {
        throw new Error(`${subdomain} not found.`)
      }
      const instanceRootDir = restOfVirtualPath[0]
      if (
        instanceRootDir &&
        MAINTENANCE_ONLY_INSTANCE_ROOTS.includes(instanceRootDir) &&
        !instance.maintenance
      ) {
        throw new Error(
          `Instance must be in maintenance mode to access ${instanceRootDir}`,
        )
      }
      fsPathParts.push(instance.id)
      dbg({
        fsPathParts,
        instance,
      })
      return instance
    })()

    // Finalize the fs path
    const fsPath = resolve(
      join(...fsPathParts, ...restOfVirtualPath)
        .replace(UNIX_SEP_REGEX, sep)
        .replace(WIN_SEP_REGEX, sep),
    )

    // Create FTP client path using unix separator
    const clientPath = finalVirtualPath.replace(WIN_SEP_REGEX, '/')

    dbg({
      clientPath,
      fsPath,
      restOfVirtualPath,
      instance,
    })

    return {
      clientPath,
      fsPath,
      instance,
    }
  }

  currentDirectory() {
    return this.cwd
  }

  async chdir(path = '.') {
    const { fsPath, clientPath } = await this._resolvePath(path)

    return fsAsync
      .stat(fsPath)
      .then((stat) => {
        if (!stat.isDirectory()) throw new Error('Not a valid directory')
      })
      .then(() => {
        this.cwd = clientPath
        return this.currentDirectory()
      })
  }

  async list(path = '.') {
    const { dbg, error } = this.log
      .create(`list`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(path)

    const { fsPath, instance } = await this._resolvePath(path)

    /*
    If a subdomain is not specified, we are in the user's root. List all subdomains.
    */
    if (!instance) {
      const instances = await this.client.collection(`instances`).getFullList()
      return instances.map((i) => {
        return {
          isDirectory: () => true,
          mode: 0o755,
          size: 0,
          mtime: Date.parse(i.updated),
          name: i.subdomain,
        }
      })
    }

    /*
    If we do have a root folder name, it will include teh instance ID at this point
    List it's contents
    */
    return fsAsync
      .readdir(fsPath)
      .then((fileNames) => {
        return Promise.all(
          map(fileNames, (fileName) => {
            const filePath = join(fsPath, fileName)
            return fsAsync
              .access(filePath, constants.F_OK)
              .then(() => {
                return fsAsync.stat(filePath).then((stat) => {
                  const _stat = stat as unknown as FileStat
                  _stat.name = fileName
                  return _stat
                })
              })
              .catch(() => null)
          }),
        )
      })
      .then(compact)
  }

  async get(fileName: string): Promise<FileStat> {
    const { fsPath, instance, clientPath } = await this._resolvePath(fileName)

    const { dbg, error } = this.log
      .create(`get`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(fileName)
      .breadcrumb(fsPath)
    dbg(`get`)

    /*
    If the instance subdomain is not specified, we are in the root
    */
    if (!instance) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: +new Date(),
        name: '/',
      }
    }

    const isInstanceRoot = clientPath.split('/').filter((p) => !!p).length === 0
    /*
    If we don't have a root folder, we're at the instance subdomain level
    */
    if (!isInstanceRoot) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: instance.subdomain,
      }
    }

    /*
    Otherwise, this might be an actual file
    */
    return fsAsync.stat(fsPath).then((stat) => {
      const _stat = stat as unknown as FileStat
      _stat.name = fileName
      return _stat
    })
  }

  async write(
    fileName: string,
    options?: { append?: boolean | undefined; start?: any } | undefined,
  ) {
    const { dbg, error } = this.log
      .create(`write`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(fileName)
    dbg(`write`)

    const { fsPath, clientPath, instance } = await this._resolvePath(fileName)
    assert(instance, `Instance expected here`)

    const { append, start } = options || {}

    const stream = createWriteStream(fsPath, {
      flags: !append ? 'w+' : 'a+',
      start,
    })

    stream.once('error', (e) => {
      error(`write(${fileName}) error`)
      error(e)
      fsAsync.unlink(fsPath)
    })
    stream.once('close', () => {
      const virtualPath = join(this.cwd, fileName)
      dbg(`write(${virtualPath}) closing`)
      stream.end()
      checkBun(instance, virtualPath, dirname(fsPath))
    })
    return {
      stream,
      clientPath,
    }
  }

  async read(
    fileName: string,
    options: { start?: any } | undefined,
  ): Promise<any> {
    const { dbg, error } = this.log
      .create(`read`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(fileName)
    dbg(`read`)

    const { fsPath, clientPath } = await this._resolvePath(fileName)

    const { start } = options || {}

    return fsAsync
      .stat(fsPath)
      .then((stat) => {
        if (stat.isDirectory()) throw new Error('Cannot read a directory')
      })
      .then(() => {
        const stream = createReadStream(fsPath, { flags: 'r', start })
        return {
          stream,
          clientPath,
        }
      })
  }

  async delete(path: string) {
    const { dbg, error } = this.log
      .create(`delete`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(path)
    dbg(`delete`)

    const { fsPath, instance } = await this._resolvePath(path)
    assert(instance, `Instance expected here`)

    return fsAsync.stat(fsPath).then((stat) => {
      if (stat.isDirectory()) {
        return fsAsync.rmdir(fsPath)
      }
      return fsAsync.unlink(fsPath)
    })
  }

  async mkdir(path: string) {
    const { dbg, error } = this.log
      .create(`mkdir`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(path)
    dbg(`mkdir`)

    const { fsPath } = await this._resolvePath(path)

    return fsAsync.mkdir(fsPath, { recursive: true }).then(() => fsPath)
  }

  async rename(from: string, to: string) {
    const { dbg, error } = this.log
      .create(`rename`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(from)
      .breadcrumb(to)
    dbg(`rename`)

    const { fsPath: fromPath, instance } = await this._resolvePath(from)

    const { fsPath: toPath } = await this._resolvePath(to)

    assert(instance, `Instance expected here`)

    return fsAsync.rename(fromPath, toPath)
  }

  async chmod(path: string, mode: Mode) {
    const { dbg, error } = this.log
      .create(`chmod`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(path)
      .breadcrumb(mode.toString())
    dbg(`chmod`)

    const { fsPath } = await this._resolvePath(path)

    return // noop
    return fsAsync.chmod(fsPath, mode)
  }

  getUniqueName() {
    return newId(30)
  }
}
