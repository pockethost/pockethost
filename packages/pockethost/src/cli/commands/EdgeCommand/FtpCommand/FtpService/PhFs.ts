import { Logger, PocketBase, seqid } from '@'
import { Mode } from 'fs'
import { FileStat, FileSystem, FtpConnection } from 'ftp-srv'
import { InstanceVfs, VfsEntry } from '../../../../../services/InstanceFileAccess'

const toFileStat = (entry: VfsEntry): FileStat => {
  const stat = {
    isDirectory: () => entry.isDirectory,
    mode: entry.mode,
    size: entry.size,
    mtime: entry.mtime,
    name: entry.name,
  }
  return stat as unknown as FileStat
}

export class PhFs implements FileSystem {
  private vfs: InstanceVfs
  connection: FtpConnection

  constructor(connection: FtpConnection, client: PocketBase, logger: Logger) {
    this.connection = connection
    this.vfs = new InstanceVfs(client, logger.create(`PhFs`))
  }

  get root() {
    return this.vfs.root
  }

  get cwd() {
    return this.vfs.cwd
  }

  get client() {
    return this.vfs.client
  }

  currentDirectory() {
    return this.vfs.currentDirectory()
  }

  async chdir(path = '.') {
    return this.vfs.chdir(path)
  }

  async list(path = '.') {
    const entries = await this.vfs.list(path)
    return entries.map(toFileStat)
  }

  async get(fileName: string): Promise<FileStat> {
    const entry = await this.vfs.stat(fileName)
    return toFileStat(entry)
  }

  async write(fileName: string, options?: { append?: boolean | undefined; start?: any } | undefined) {
    const { stream, clientPath } = await this.vfs.write(fileName, options)
    return {
      stream,
      clientPath,
    }
  }

  async read(fileName: string, options: { start?: any } | undefined): Promise<any> {
    const { stream, clientPath } = await this.vfs.read(fileName, options)
    return {
      stream,
      clientPath,
    }
  }

  async delete(path: string) {
    return this.vfs.delete(path)
  }

  async mkdir(path: string) {
    return this.vfs.mkdir(path)
  }

  async rename(from: string, to: string) {
    return this.vfs.rename(from, to)
  }

  async chmod(path: string, mode: Mode) {
    return this.vfs.chmod(path, mode)
  }

  getUniqueName() {
    return seqid()
  }
}
