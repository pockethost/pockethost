import { DAEMON_PB_DATA_DIR } from '$constants'
import { Logger } from '@pockethost/common'
import { existsSync, mkdirSync } from 'fs'
import { FileStat, FileSystem, FtpConnection } from 'ftp-srv'
import { join } from 'path'
import { Readable } from 'stream'
import { PocketbaseClientApi } from '../clientService/PbClient'
import {
  FOLDER_NAMES,
  isFolder,
  README_CONTENTS,
  README_NAME,
} from './FtpService'

export class PhFs extends FileSystem {
  private log: Logger
  private client: PocketbaseClientApi

  constructor(
    connection: FtpConnection,
    client: PocketbaseClientApi,
    logger: Logger
  ) {
    super(connection, { root: '/', cwd: '/' })
    this.client = client
    this.log = logger.create(`PhFs`)
  }

  async chdir(path?: string | undefined): Promise<string> {
    this.log.dbg(`chdir`, path)
    if (!path) {
      throw new Error(`Expected path`)
    }
    const _path = path.startsWith('/') ? path : join(this.cwd, path)
    const [empty, subdomain] = _path.split('/')
    this.log.dbg({ _path, subdomain })

    if (subdomain) {
      const instance = await this.client.getInstanceBySubdomain(subdomain)
      if (!instance) {
        throw new Error(`Subdomain not found`)
      }
    }
    this.cwd = _path
    return path
  }

  async list(path?: string | undefined): Promise<FileStat[]> {
    this.log.dbg(`list ${path}`, this.cwd)
    if (!path) {
      throw new Error(`Expected path`)
    }
    const _path = path.startsWith('/') ? path : join(this.cwd, path)
    const [empty, subdomain, folderName, ...restOfPath] = _path.split('/')
    this.log.dbg({ _path, subdomain, folderName, restOfPath })

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
    if (!subdomain) {
      throw new Error(`Subdomain expected in ${_path}`)
    }
    const [instance, user] = await this.client.getInstanceBySubdomain(subdomain)
    if (!instance) {
      throw new Error(`Expected instance here`)
    }
    if (!folderName) {
      return FOLDER_NAMES.map((name) => ({
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: name,
      }))
    }
    if (!isFolder(folderName)) {
      throw new Error(`Top level folder name ${folderName} not allowed.`)
    }
    const dir = join(DAEMON_PB_DATA_DIR, instance.id, folderName, ...restOfPath)
    this.log.dbg({ dir, exists: existsSync(dir) })
    return [
      ...(restOfPath.length === 0
        ? [
            {
              isDirectory: () => false,
              mode: 0o444,
              size: README_CONTENTS[folderName].length,
              mtime: Date.parse(instance.updated),
              name: README_NAME,
            },
          ]
        : []),
      ...(existsSync(dir) ? await super.list(dir) : []),
    ]
  }

  async get(fileName: string): Promise<FileStat> {
    const path = fileName.startsWith('/') ? fileName : join(this.cwd, fileName)
    const [empty, subdomain, folderName, ...fNames] = path.split('/')
    const fName = fNames.join('/')
    this.log.dbg(`get`, { _path: path, subdomain, folderName, fName, fileName })

    if (!subdomain) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: +new Date(),
        name: '/',
      }
    }
    const [instance, user] = await this.client.getInstanceBySubdomain(subdomain)
    if (!instance) {
      throw new Error(`Expected instance here`)
    }
    if (!folderName) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: subdomain,
      }
    }
    if (!isFolder(folderName)) {
      throw new Error(`Invalid folder name`)
    }
    if (!fName) {
      return {
        isDirectory: () => true,
        mode: 0o755,
        size: 0,
        mtime: Date.parse(instance.updated),
        name: folderName,
      }
    }
    const physicalPath = join(
      DAEMON_PB_DATA_DIR,
      instance.id,
      folderName,
      fName
    )
    this.log.dbg({ physicalPath, exists: existsSync(physicalPath) })

    return super.get(physicalPath)
  }

  async write(
    fileName: string,
    options?: { append?: boolean | undefined; start?: any } | undefined
  ) {
    const _path = fileName.startsWith('/') ? fileName : join(this.cwd, fileName)
    const [empty, subdomain, folderName, ...fNames] = _path.split('/')
    const fName = fNames.join('/')
    this.log.dbg(`read`, { subdomain, folderName, fName })

    if (!subdomain) {
      throw new Error(`Subdomain not found`)
    }
    if (!folderName) {
      throw new Error(`Folder name expected here`)
    }
    const [instance, user] = await this.client.getInstanceBySubdomain(subdomain)
    if (!instance) {
      throw new Error(`Expected instance here`)
    }
    if (!isFolder(folderName)) {
      throw new Error(`Invalid folder name ${folderName}`)
    }

    if (fName === README_NAME) {
      throw new Error(`Can't overwrite ${fName}`)
    }
    const dir = join(DAEMON_PB_DATA_DIR, instance.id, folderName)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    return super.write(join(dir, fName), options)
  }

  async read(
    fileName: string,
    options: { start?: any } | undefined
  ): Promise<any> {
    const _path = fileName.startsWith('/') ? fileName : join(this.cwd, fileName)
    const [empty, subdomain, folderName, ...fNames] = _path.split('/')
    const fName = fNames.join('/')
    this.log.dbg(`read`, { subdomain, folderName, fName })

    if (!subdomain) {
      throw new Error(`Subdomain not found`)
    }
    if (!folderName) {
      throw new Error(`Folder name expected here`)
    }
    const [instance, user] = await this.client.getInstanceBySubdomain(subdomain)
    if (!instance) {
      throw new Error(`Expected instance here`)
    }
    if (!isFolder(folderName)) {
      throw new Error(`Invalid folder name ${folderName}`)
    }

    if (fName === README_NAME) {
      return Readable.from([README_CONTENTS[folderName]])
    }
    const realPath = join(
      `/`,
      DAEMON_PB_DATA_DIR,
      instance.id,
      folderName,
      fName
    )
    this.log.dbg({ realPath })
    return super.read(realPath, options)
  }

  async delete(path: string): Promise<any> {
    throw new Error(`delete ${path}`)
  }

  async mkdir(path: string): Promise<any> {
    throw new Error(`mkdir ${path}`)
  }

  async rename(from: string, to: string): Promise<any> {
    throw new Error(`rename ${from} ${to}`)
  }

  async chmod(path: string, mode: string): Promise<any> {
    throw new Error(`chmod ${path} ${mode}`)
  }

  getUniqueName(fileName: string): string {
    throw new Error(`getUniqueName ${fileName}`)
  }
}
