import { DAEMON_PB_DATA_DIR } from '$constants'
import { assert } from '$util'
import { InstanceFields, Logger } from '@pockethost/common'
import { compact, map } from '@s-libs/micro-dash'
import {
  constants,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  Mode,
} from 'fs'
import { FileStat, FileSystem, FtpConnection } from 'ftp-srv'
import { customAlphabet } from 'nanoid'
import { isAbsolute, join, normalize, resolve, sep } from 'path'
import { PocketbaseClientApi } from '../clientService/PbClient'
import * as fsAsync from './fs-async'
import {
  FolderNames,
  INSTANCE_ROOT_FOLDER_NAMES,
  isInstanceRootFolder,
  MAINTENANCE_ONLY_FOLDER_NAMES,
} from './FtpService'

const nanoid = customAlphabet(`abcdefghijklmnop`)

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

export class PhFs implements FileSystem {
  private log: Logger
  private client: PocketbaseClientApi
  connection: FtpConnection
  cwd: string
  private _root: string

  constructor(
    connection: FtpConnection,
    client: PocketbaseClientApi,
    logger: Logger
  ) {
    const cwd = `/`
    const root = DAEMON_PB_DATA_DIR
    this.connection = connection
    this.client = client
    this.log = logger.create(`PhFs`)
    this.cwd = normalize((cwd || '/').replace(WIN_SEP_REGEX, '/'))
    this._root = resolve(root || process.cwd())
  }

  get root() {
    return this._root
  }

  async _resolvePath(path = '.') {
    const { dbg } = this.log.create(`_resolvePath`)

    // Unix separators normalize nicer on both unix and win platforms
    const resolvedPath = path.replace(WIN_SEP_REGEX, '/')

    // Join cwd with new path
    const joinedPath = isAbsolute(resolvedPath)
      ? normalize(resolvedPath)
      : join('/', this.cwd, resolvedPath)

    // Create local filesystem path using the platform separator
    const [empty, subdomain, rootFolderName, ...pathFromRootFolder] =
      joinedPath.split('/')
    dbg({
      joinedPath,
      subdomain,
      rootFolderName,
      restOfPath: pathFromRootFolder,
    })

    // Check if the root folder name is valid
    if (rootFolderName) {
      if (!isInstanceRootFolder(rootFolderName)) {
        throw new Error(`Accessing ${rootFolderName} is not allowed.`)
      }
    }

    // Begin building the physical path
    const fsPathParts: string[] = [this._root]

    // Check if the instance is valid
    const instance = await (async () => {
      if (subdomain) {
        const [instance] = await this.client.getInstanceBySubdomain(subdomain)
        if (!instance) {
          throw new Error(`${subdomain} not found.`)
        }
        fsPathParts.push(instance.id)
        if (rootFolderName) {
          dbg({ rootFolderName, instance })
          if (
            MAINTENANCE_ONLY_FOLDER_NAMES.includes(
              rootFolderName as FolderNames
            ) &&
            !instance.maintenance
          ) {
            throw new Error(
              `Instance must be in maintenance mode to access ${rootFolderName}`
            )
          }
          fsPathParts.push(rootFolderName)
          // Ensure folder exists
          const rootFolderFsPath = resolve(
            join(...fsPathParts)
              .replace(UNIX_SEP_REGEX, sep)
              .replace(WIN_SEP_REGEX, sep)
          )
          if (!existsSync(rootFolderFsPath)) {
            mkdirSync(rootFolderFsPath)
          }
        }
        if (resolvedPath.length > 0) fsPathParts.push(...pathFromRootFolder)
        return instance
      }
    })()

    // Finalize the fs path
    const fsPath = resolve(
      join(...fsPathParts)
        .replace(UNIX_SEP_REGEX, sep)
        .replace(WIN_SEP_REGEX, sep)
    )

    // Create FTP client path using unix separator
    const clientPath = joinedPath.replace(WIN_SEP_REGEX, '/')

    dbg({
      clientPath,
      fsPath,
      subdomain,
      rootFolderName,
      restOfPath: pathFromRootFolder,
      instance,
    })

    return {
      clientPath,
      fsPath,
      subdomain,
      rootFolderName: rootFolderName as FolderNames | undefined,
      pathFromRootFolder,
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

    const { fsPath, subdomain, rootFolderName, instance } =
      await this._resolvePath(path)

    /*
    If a subdomain is not specified, we are in the user's root. List all subdomains.
    */
    if (subdomain === '') {
      const instances = await this.client.getInstances()
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
    If we have a subdomain, then it should have resolved to an instance owned by that user
    */
    if (!instance) {
      throw new Error(
        `Something as gone wrong. An instance without a subdomain is not possible.`
      )
    }

    /*
    If there is no root folder name, then we are in the instance root. In this case, list
    our allowed folder names. 
    */
    if (!rootFolderName) {
      return INSTANCE_ROOT_FOLDER_NAMES.map((name) => ({
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: name,
      }))
    }

    /*
    If we do have a root folder name, then we list its contents
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
          })
        )
      })
      .then(compact)
  }

  async get(fileName: string): Promise<FileStat> {
    const { fsPath, subdomain, instance, rootFolderName, pathFromRootFolder } =
      await this._resolvePath(fileName)

    const { dbg, error } = this.log
      .create(`get`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(fileName)
      .breadcrumb(fsPath)
    dbg(`get`)

    /*
    If the subdomain is not specified, we are in the root
    */
    if (!subdomain) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: +new Date(),
        name: '/',
      }
    }

    /*
    We are in a subdomain, we must have an instance
    */
    if (!instance) {
      throw new Error(`Expected instance here`)
    }

    /*
    If we don't have a root folder, we're at the instance subdomain level
    */
    if (!rootFolderName) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: subdomain,
      }
    }

    /*
    If we don't have a path beneath the root folder, we're at a root folder level
    */
    if (!pathFromRootFolder) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: rootFolderName,
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
    options?: { append?: boolean | undefined; start?: any } | undefined
  ) {
    const { dbg, error } = this.log
      .create(`write`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(fileName)
    dbg(`write`)

    const { fsPath, clientPath, rootFolderName, pathFromRootFolder, instance } =
      await this._resolvePath(fileName)
    assert(instance, `Instance expected here`)

    const { append, start } = options || {}

    /*
    If we are not in a root folder, disallow writing
    */
    if (pathFromRootFolder.length === 0) {
      throw new Error(`write not allowed at this level`)
    }

    const stream = createWriteStream(fsPath, {
      flags: !append ? 'w+' : 'a+',
      start,
    })

    stream.once('error', (e) => {
      error(`write(${fileName}) error`)
      error(e)
      fsAsync.unlink(fsPath)
    })
    stream.once('close', async () => {
      dbg(`write(${fileName}) closing`)
      stream.end()
      await this.restartInstanceGuard(rootFolderName, instance)
    })
    return {
      stream,
      clientPath,
    }
  }

  async read(
    fileName: string,
    options: { start?: any } | undefined
  ): Promise<any> {
    const { dbg, error } = this.log
      .create(`read`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(fileName)
    dbg(`read`)

    const { fsPath, clientPath, pathFromRootFolder } = await this._resolvePath(
      fileName
    )

    const { start } = options || {}

    /*
    If we are not in a root folder, disallow reading
    */
    if (pathFromRootFolder.length === 0) {
      throw new Error(`read not allowed at this level`)
    }

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

    const { fsPath, clientPath, pathFromRootFolder, rootFolderName, instance } =
      await this._resolvePath(path)
    assert(instance, `Instance expected here`)

    /*
    Disallow deleting if not inside root folder
    */
    if (pathFromRootFolder.length === 0) {
      throw new Error(`delete not allowed at this level`)
    }

    return fsAsync.stat(fsPath).then((stat) => {
      const _cleanup = () => this.restartInstanceGuard(rootFolderName, instance)
      if (stat.isDirectory()) return fsAsync.rmdir(fsPath).then(_cleanup)
      else return fsAsync.unlink(fsPath).then(_cleanup)
    })
  }

  async mkdir(path: string) {
    const { dbg, error } = this.log
      .create(`mkdir`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(path)
    dbg(`mkdir`)

    const { fsPath, clientPath, pathFromRootFolder } = await this._resolvePath(
      path
    )

    /*
    Disallow making directories if not inside root folder
    */
    if (pathFromRootFolder.length === 0) {
      throw new Error(`mkdir not allowed at this level`)
    }

    return fsAsync.mkdir(fsPath, { recursive: true }).then(() => fsPath)
  }

  async rename(from: string, to: string) {
    const { dbg, error } = this.log
      .create(`rename`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(from)
      .breadcrumb(to)
    dbg(`rename`)

    const {
      fsPath: fromPath,
      pathFromRootFolder: fromPathFromRootFolder,
      rootFolderName: fromRootFolderName,
      instance,
    } = await this._resolvePath(from)

    const {
      fsPath: toPath,
      pathFromRootFolder: toPathFromRootFolder,
      rootFolderName: toRootFolderName,
    } = await this._resolvePath(to)

    assert(instance, `Instance expected here`)
    /*
    Disallow making directories if not inside root folder
    */
    if (fromPathFromRootFolder.length === 0) {
      throw new Error(`rename not allowed at this level`)
    }
    if (toPathFromRootFolder.length === 0) {
      throw new Error(`rename not allowed at this level`)
    }

    return fsAsync
      .rename(fromPath, toPath)
      .then(() =>
        Promise.all([
          this.restartInstanceGuard(fromRootFolderName, instance),
          this.restartInstanceGuard(toRootFolderName, instance),
        ])
      )
  }

  async chmod(path: string, mode: Mode) {
    const { dbg, error } = this.log
      .create(`chmod`)
      .breadcrumb(`cwd:${this.cwd}`)
      .breadcrumb(path)
      .breadcrumb(mode.toString())
    dbg(`chmod`)

    const { fsPath, clientPath, pathFromRootFolder } = await this._resolvePath(
      path
    )

    /*
    Disallow making directories if not inside root folder
    */
    if (pathFromRootFolder.length === 0) {
      throw new Error(`chmod not allowed at this level`)
    }
    return // noop
    return fsAsync.chmod(fsPath, mode)
  }

  getUniqueName() {
    return nanoid(30)
  }

  async restartInstanceGuard(
    rootFolderName: FolderNames | undefined,
    instance: InstanceFields
  ) {
    // Not needed?
    // const { dbg, error } = this.log
    // if (rootFolderName && includes(RESTART_ON_WRITE, rootFolderName)) {
    //   try {
    //     dbg(`Restarting instance`)
    //     const is = await instanceService()
    //     const api = is.getInstanceApiIfExistsById(instance.id)
    //     await api?.shutdown()
    //   } catch (e) {
    //     error(e)
    //   }
    // }
  }
}
