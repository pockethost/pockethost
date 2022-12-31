import { Logger, logger, mkSingleton } from '@pockethost/common'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { FileStat, FileSystem, FtpConnection, FtpSrv } from 'ftp-srv'
import { join } from 'path'
import { Readable } from 'stream'
import {
  DAEMON_PB_DATA_DIR,
  PH_FTP_PORT,
  SSL_CERT,
  SSL_KEY,
} from '../constants'
import {
  clientService,
  createPbClient,
  PocketbaseClientApi,
} from '../db/PbClient'

export type FtpConfig = {}

export enum FolderNames {
  PbData = 'pb_data',
  PbStatic = 'pb_static',
  PbWorkers = 'workers',
  PbBackup = 'backup',
}

const README_CONTENTS: { [_ in FolderNames]: string } = {
  [FolderNames.PbBackup]: `This directory contains tgz backups of your data. PocketHost creates these automatically, or you can create them manually. For more information, see https://pockethost.io/docs/backups`,
  [FolderNames.PbData]: `This directory contains your PocketBase data. For more information, see https://pockethost.io/docs/data`,
  [FolderNames.PbStatic]: `This directory contains static files such as your web frontend. PocketHost will serve these when your instance URL receives a request. For more information, see https://pockethost.io/docs/static `,
  [FolderNames.PbWorkers]: `This directory contains your Deno workers. For more information, see https://pockethost.io/docs/workers`,
}
const README_NAME = 'readme.md'

const FOLDER_NAMES: FolderNames[] = [
  FolderNames.PbBackup,
  FolderNames.PbData,
  FolderNames.PbStatic,
  FolderNames.PbWorkers,
]

function isFolder(name: string): name is FolderNames {
  return FOLDER_NAMES.includes(name as FolderNames)
}

class PhFs extends FileSystem {
  private log: Logger
  private client: PocketbaseClientApi

  constructor(connection: FtpConnection, client: PocketbaseClientApi) {
    super(connection, { root: '/', cwd: '/' })
    this.client = client
    this.log = logger().create(`PhFs`)
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
    const [empty, subdomain, folderName] = _path.split('/')
    this.log.dbg({ _path, subdomain, folderName })

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
    if (subdomain) {
      const [instance, user] = await this.client.getInstanceBySubdomain(
        subdomain
      )
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
      if (isFolder(folderName)) {
        const dir = join(DAEMON_PB_DATA_DIR, instance.id, folderName)
        this.log.dbg({ dir, exists: existsSync(dir) })
        return [
          {
            isDirectory: () => false,
            mode: 0o444,
            size: README_CONTENTS[folderName].length,
            mtime: Date.parse(instance.updated),
            name: README_NAME,
          },
          ...(existsSync(dir)
            ? await super.list(
                join(DAEMON_PB_DATA_DIR, instance.id, folderName)
              )
            : []),
        ]
      }
    }
    throw new Error(`Error parsing ${_path}`)
  }

  async get(fileName: string): Promise<FileStat> {
    const _path = fileName.startsWith('/') ? fileName : join(this.cwd, fileName)
    const [empty, subdomain, folderName, ...fNames] = _path.split('/')
    const fName = fNames.join('/')
    this.log.dbg(`get`, { _path, subdomain, folderName, fName, fileName })

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
    return super.get(_path)
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

const tls = {
  key: readFileSync(SSL_KEY || ''),
  cert: readFileSync(SSL_CERT || ''),
}

export const ftpService = mkSingleton((config: FtpConfig) => {
  const log = logger().create('FtpService')
  const { dbg, info } = log

  const ftpServer = new FtpSrv({
    url: 'ftp://0.0.0.0:' + PH_FTP_PORT,
    anonymous: false,
    log: log.create(`ftpServer`, { errorTrace: false }),
    tls,
    pasv_url: `147.182.196.168`,
    pasv_max: 20000,
    pasv_min: 10000,
  })

  ftpServer.on(
    'login',
    async ({ connection, username, password }, resolve, reject) => {
      const url = (await clientService()).url
      const client = createPbClient(url)
      try {
        await client.client
          .collection('users')
          .authWithPassword(username, password)
        dbg(`Logged in`)
        const fs = new PhFs(connection, client)
        resolve({ fs })
      } catch (e) {
        reject(new Error(`Invalid username or password`))
      }
    }
  )

  ftpServer.listen().then(() => {
    info('Ftp server is starting...')
  })

  const shutdown = () => {
    info(`Closing FTP server`)
    ftpServer.close()
  }

  return { shutdown }
})
