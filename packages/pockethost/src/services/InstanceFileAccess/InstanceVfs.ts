import { InstanceFields, Logger, PocketBase, ensureInstanceDirectoryStructure } from '@'
import { Mode, constants, createReadStream, createWriteStream } from 'fs'
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'path'
import { INSTANCES_ROOT } from '../../constants'
import { checkBun } from './bunSideEffects'
import { assertInstanceContext, isExpectedVfsClientError, isVfsNotFoundError } from './errors'
import * as fsAsync from './fs-async'
import {
  INSTANCE_ROOT_DIR_NAMES,
  POWERED_OFF_ONLY,
  assertNotInstanceRootDelete,
  assertNotInstanceRootMkdir,
  assertNotInstanceRootMutation,
  isAllowedInstanceRootDir,
  isAtInstanceRoot,
} from './guards'
import { VfsScope, instanceAllowedByScope } from './scope'

const UNIX_SEP_REGEX = /\//g
const WIN_SEP_REGEX = /\\/g

export type VfsEntry = {
  name: string
  isDirectory: boolean
  mode: number
  size: number
  mtime: number
}

export type ResolvedPath = {
  clientPath: string
  fsPath: string
  instance?: InstanceFields
  restOfVirtualPath: string[]
}

export class InstanceVfs {
  private log: Logger
  private _root: string
  client: PocketBase
  cwd: string
  private scope?: VfsScope

  constructor(client: PocketBase, logger: Logger, scope?: VfsScope) {
    this.client = client
    this.log = logger.create(`InstanceVfs`)
    this.cwd = normalize(`/`.replace(WIN_SEP_REGEX, '/'))
    this._root = resolve(INSTANCES_ROOT() || process.cwd())
    this.scope = scope
  }

  private assertInstanceAccess(instance: InstanceFields) {
    if (!this.scope) {
      return
    }

    if (!instanceAllowedByScope(this.scope, instance.id, instance.uid)) {
      throw new Error(`${instance.subdomain} not found.`)
    }
  }

  private async listAccessibleInstances(): Promise<InstanceFields[]> {
    if (!this.scope) {
      return this.client.collection(`instances`).getFullList<InstanceFields>()
    }

    const instances = await this.client.collection(`instances`).getFullList<InstanceFields>({
      filter: `uid=${JSON.stringify(this.scope.userId)}`,
    })

    return instances.filter((instance) => instanceAllowedByScope(this.scope, instance.id, instance.uid))
  }

  get root() {
    return this._root
  }

  currentDirectory() {
    return this.cwd
  }

  async resolvePath(virtualPath = '.') {
    const { dbg } = this.log.create(`resolvePath`)

    const resolvedVirtualPath = virtualPath.replace(WIN_SEP_REGEX, '/')

    const finalVirtualPath = isAbsolute(resolvedVirtualPath)
      ? normalize(resolvedVirtualPath)
      : join('/', this.cwd, resolvedVirtualPath)

    const [, subdomain, ...restOfVirtualPath] = finalVirtualPath.split('/')
    dbg({
      finalVirtualPath,
      subdomain,
      restOfVirtualPath,
    })

    const fsPathParts: string[] = [this._root]

    const instance = await (async () => {
      dbg(`checking validity`, { subdomain })
      if (!subdomain) return
      const filter = this.scope
        ? `subdomain=${JSON.stringify(subdomain)} && uid=${JSON.stringify(this.scope.userId)}`
        : `subdomain=${JSON.stringify(subdomain)}`
      const instance = await this.client.collection(`instances`).getFirstListItem<InstanceFields>(filter)
      if (!instance) {
        throw new Error(`${subdomain} not found.`)
      }
      this.assertInstanceAccess(instance)
      const instanceRootDir = restOfVirtualPath[0]
      if (instanceRootDir && POWERED_OFF_ONLY.includes(instanceRootDir) && instance.power) {
        throw new Error(`Instance must be powered off first`)
      }
      fsPathParts.push(instance.id)
      ensureInstanceDirectoryStructure(instance.id, this.log)
      dbg({
        fsPathParts,
        instance,
      })
      return instance
    })()

    const fsPath = resolve(
      join(...fsPathParts, ...restOfVirtualPath)
        .replace(UNIX_SEP_REGEX, sep)
        .replace(WIN_SEP_REGEX, sep)
    )

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
      restOfVirtualPath,
    } satisfies ResolvedPath
  }

  private virtualInstanceRootEntries(instance: InstanceFields): VfsEntry[] {
    return INSTANCE_ROOT_DIR_NAMES.map((name) => ({
      name,
      isDirectory: true,
      mode: 0o755,
      size: 0,
      mtime: Date.parse(instance.updated),
    }))
  }

  async chdir(path = '.') {
    const { fsPath, clientPath, instance, restOfVirtualPath } = await this.resolvePath(path)

    if (isAtInstanceRoot(restOfVirtualPath, instance)) {
      this.cwd = clientPath
      return this.currentDirectory()
    }

    return fsAsync
      .stat(fsPath)
      .then((stat) => {
        if (!stat.isDirectory()) throw new Error('Not a valid directory')
      })
      .then(() => {
        this.cwd = clientPath
        return this.currentDirectory()
      })
      .catch(() => {
        throw new Error(`no such file or directory: ${path}`)
      })
  }

  async list(path = '.'): Promise<VfsEntry[]> {
    const { fsPath, instance, restOfVirtualPath } = await this.resolvePath(path)

    if (!instance) {
      const instances = await this.listAccessibleInstances()
      return instances.map((i) => ({
        isDirectory: true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(i.updated),
        name: i.subdomain,
      }))
    }

    if (isAtInstanceRoot(restOfVirtualPath, instance)) {
      return this.virtualInstanceRootEntries(instance)
    }

    const fileNames = await fsAsync.readdir(fsPath)
    const stats = await Promise.all(
      fileNames.map(async (fileName) => {
        const filePath = join(fsPath, fileName)
        try {
          await fsAsync.access(filePath, constants.F_OK)
          const stat = await fsAsync.stat(filePath)
          return {
            name: fileName,
            isDirectory: stat.isDirectory(),
            mode: stat.mode,
            size: stat.size,
            mtime: stat.mtimeMs,
          } satisfies VfsEntry
        } catch {
          return null
        }
      })
    )
    return stats.filter((stat): stat is VfsEntry => stat != null)
  }

  async stat(fileName: string): Promise<VfsEntry> {
    const { fsPath, instance, clientPath, restOfVirtualPath } = await this.resolvePath(fileName)

    if (!instance) {
      return {
        isDirectory: true,
        mode: 0o755,
        size: 0,
        mtime: Date.now(),
        name: '/',
      }
    }

    if (isAtInstanceRoot(restOfVirtualPath, instance)) {
      return {
        isDirectory: true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: instance.subdomain,
      }
    }

    if (restOfVirtualPath.length === 1 && isAllowedInstanceRootDir(restOfVirtualPath[0]!)) {
      return {
        isDirectory: true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: restOfVirtualPath[0]!,
      }
    }

    const stat = await fsAsync.stat(fsPath)
    return {
      name: fileName.split('/').filter(Boolean).pop() || fileName,
      isDirectory: stat.isDirectory(),
      mode: stat.mode,
      size: stat.size,
      mtime: stat.mtimeMs,
    }
  }

  async write(fileName: string, options?: { append?: boolean; start?: number }) {
    const logger = this.log.create(`write`).breadcrumb(this.cwd).breadcrumb(fileName)
    const { dbg, error } = logger
    dbg(`write`)

    const { fsPath, clientPath, instance, restOfVirtualPath } = await this.resolvePath(fileName)
    assertInstanceContext(instance)
    this.assertMutablePath(restOfVirtualPath, instance, 'write')

    const { append, start } = options || {}

    const stream = createWriteStream(fsPath, {
      flags: !append ? 'w+' : 'a+',
      start,
    })

    stream.once('error', (e) => {
      if (isExpectedVfsClientError(e)) {
        dbg(`write(${fileName}) client error`, e)
      } else {
        error(`write(${fileName}) error`)
        error(e)
      }
      fsAsync.unlink(fsPath).catch(() => {})
    })
    stream.once('close', () => {
      const virtualPath = join(this.cwd, fileName)
      dbg(`write(${virtualPath}) closing`)
      stream.end(() => {
        checkBun(instance, virtualPath, dirname(fsPath), logger)
      })
    })
    return {
      stream,
      clientPath,
      fsPath,
      instance,
    }
  }

  async read(fileName: string, options?: { start?: number }) {
    const { dbg } = this.log.create(`read`).breadcrumb(this.cwd).breadcrumb(fileName)
    dbg(`read`)

    const { fsPath, clientPath } = await this.resolvePath(fileName)
    const { start } = options || {}

    const stat = await fsAsync.stat(fsPath)
    if (stat.isDirectory()) throw new Error('Cannot read a directory')

    const stream = createReadStream(fsPath, { flags: 'r', start })
    return {
      stream,
      clientPath,
      fsPath,
    }
  }

  async delete(path: string) {
    const { dbg } = this.log.create(`delete`).breadcrumb(this.cwd).breadcrumb(path)
    dbg(`delete`)

    const { fsPath, instance, restOfVirtualPath } = await this.resolvePath(path)
    assertInstanceContext(instance)
    this.assertMutablePath(restOfVirtualPath, instance, 'delete')

    try {
      const stat = await fsAsync.stat(fsPath)
      if (stat.isDirectory()) {
        return fsAsync.rmdir(fsPath)
      }
      return fsAsync.unlink(fsPath)
    } catch (err) {
      if (isVfsNotFoundError(err)) {
        throw new Error(`no such file or directory: ${path}`)
      }
      throw err
    }
  }

  async mkdir(path: string) {
    const { dbg } = this.log.create(`mkdir`).breadcrumb(this.cwd).breadcrumb(path)
    dbg(`mkdir`)

    const { fsPath, instance, restOfVirtualPath } = await this.resolvePath(path)
    assertInstanceContext(instance)
    this.assertMutablePath(restOfVirtualPath, instance, 'mkdir')

    return fsAsync.mkdir(fsPath, { recursive: true }).then(() => fsPath)
  }

  async rename(from: string, to: string) {
    const { dbg } = this.log.create(`rename`).breadcrumb(this.cwd).breadcrumb(from).breadcrumb(to)
    dbg(`rename`)

    const { fsPath: fromPath, instance, restOfVirtualPath: fromRest } = await this.resolvePath(from)
    const { fsPath: toPath, restOfVirtualPath: toRest } = await this.resolvePath(to)

    assertInstanceContext(instance)
    this.assertMutablePath(fromRest, instance, 'rename')
    this.assertMutablePath(toRest, instance, 'rename')

    return fsAsync.rename(fromPath, toPath)
  }

  async chmod(_path: string, _mode: Mode) {
    return
  }

  assertMutablePath(
    restOfVirtualPath: string[],
    instance: InstanceFields | undefined,
    op: 'write' | 'mkdir' | 'delete' | 'rename'
  ) {
    if (!instance) return
    if (op === 'mkdir') {
      assertNotInstanceRootMkdir(restOfVirtualPath, instance)
      return
    }
    if (op === 'delete') {
      assertNotInstanceRootDelete(restOfVirtualPath, instance)
      return
    }
    assertNotInstanceRootMutation(restOfVirtualPath, instance)
    if (op === 'rename') {
      assertNotInstanceRootMkdir(restOfVirtualPath, instance)
    }
  }
}
