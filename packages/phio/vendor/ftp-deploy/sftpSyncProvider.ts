import prettyBytes from 'pretty-bytes'
import type SftpClient from 'ssh2-sftp-client'
import { DiffResult, IFilePath } from './types'
import { ISyncProvider } from './syncProvider'
import { ILogger, pluralize, retryRequest, ITimings } from './utilities'

export async function ensureSftpDir(
  client: SftpClient,
  logger: ILogger,
  timings: ITimings,
  folder: string
): Promise<void> {
  timings.start('changingDir')
  logger.verbose(`  ensuring dir ${folder}`)

  await retryRequest(logger, async () => {
    const target = folder === '.' || folder === '' ? '.' : folder
    if (target !== '.') {
      const exists = await client.exists(target)
      if (!exists) {
        await client.mkdir(target, true)
      }
      await client.realPath(target)
    }
  })

  logger.verbose(`  dir ready`)
  timings.stop('changingDir')
}

export class SFTPSyncProvider implements ISyncProvider {
  constructor(
    client: SftpClient,
    logger: ILogger,
    timings: ITimings,
    localPath: string,
    serverPath: string,
    stateName: string,
    dryRun: boolean
  ) {
    this.client = client
    this.logger = logger
    this.timings = timings
    this.localPath = localPath
    this.serverPath = serverPath
    this.stateName = stateName
    this.dryRun = dryRun
  }

  private client: SftpClient
  private logger: ILogger
  private timings: ITimings
  private localPath: string
  private serverPath: string
  private dryRun: boolean
  private stateName: string

  private getFileBreadcrumbs(fullPath: string): IFilePath {
    const pathSplit = fullPath.split('/')
    const file = pathSplit?.pop() ?? ''
    const folders = pathSplit.filter((folderName) => folderName != '')

    return {
      folders: folders.length === 0 ? null : folders,
      file: file === '' ? null : file,
    }
  }

  private async upDir(dirCount: number | null | undefined): Promise<void> {
    if (typeof dirCount !== 'number') {
      return
    }

    for (let i = 0; i < dirCount; i++) {
      await retryRequest(
        this.logger,
        async () => await this.client.realPath('..')
      )
    }
  }

  async createFolder(folderPath: string) {
    this.logger.all(`creating folder "${folderPath + '/'}"`)

    if (this.dryRun === true) {
      return
    }

    const path = this.getFileBreadcrumbs(folderPath + '/')

    if (path.folders === null) {
      this.logger.verbose(`  no need to change dir`)
    } else {
      await ensureSftpDir(
        this.client,
        this.logger,
        this.timings,
        path.folders.join('/')
      )
    }

    await this.upDir(path.folders?.length)

    this.logger.verbose(`  completed`)
  }

  async removeFile(filePath: string) {
    this.logger.all(`removing "${filePath}"`)

    if (this.dryRun === false) {
      try {
        await retryRequest(
          this.logger,
          async () => await this.client.delete(filePath)
        )
      } catch (e: any) {
        const message = `${e?.message ?? e}`.toLowerCase()
        if (message.includes('no such file') || message.includes('not found')) {
          this.logger.standard(
            "File not found or you don't have access to the file - skipping..."
          )
        } else {
          throw e
        }
      }
    }
    this.logger.verbose(`  file removed`)
    this.logger.verbose(`  completed`)
  }

  async removeFolder(folderPath: string) {
    const absoluteFolderPath =
      '/' +
      (this.serverPath.startsWith('./')
        ? this.serverPath.replace('./', '')
        : this.serverPath) +
      folderPath
    this.logger.all(`removing folder "${absoluteFolderPath}"`)

    if (this.dryRun === false) {
      await retryRequest(
        this.logger,
        async () => await this.client.rmdir(folderPath)
      )
    }

    this.logger.verbose(`  completed`)
  }

  async uploadFile(filePath: string, type: 'upload' | 'replace' = 'upload') {
    const typePresent = type === 'upload' ? 'uploading' : 'replacing'
    const typePast = type === 'upload' ? 'uploaded' : 'replaced'
    this.logger.all(`${typePresent} "${filePath}"`)

    if (this.dryRun === false) {
      await retryRequest(
        this.logger,
        async () =>
          await this.client.fastPut(this.localPath + filePath, filePath)
      )
    }

    this.logger.verbose(`  file ${typePast}`)
  }

  async syncLocalToServer(diffs: DiffResult) {
    const totalCount =
      diffs.delete.length + diffs.upload.length + diffs.replace.length

    this.logger.all(
      `----------------------------------------------------------------`
    )
    this.logger.all(
      `Making changes to ${totalCount} ${pluralize(totalCount, 'file/folder', 'files/folders')} to sync server state`
    )
    this.logger.all(
      `Uploading: ${prettyBytes(diffs.sizeUpload)} -- Deleting: ${prettyBytes(diffs.sizeDelete)} -- Replacing: ${prettyBytes(diffs.sizeReplace)}`
    )
    this.logger.all(
      `----------------------------------------------------------------`
    )

    for (const file of diffs.upload.filter((item) => item.type === 'folder')) {
      await this.createFolder(file.name)
    }

    for (const file of diffs.upload
      .filter((item) => item.type === 'file')
      .filter((item) => item.name !== this.stateName)) {
      await this.uploadFile(file.name, 'upload')
    }

    for (const file of diffs.replace
      .filter((item) => item.type === 'file')
      .filter((item) => item.name !== this.stateName)) {
      await this.uploadFile(file.name, 'replace')
    }

    for (const file of diffs.delete.filter((item) => item.type === 'file')) {
      await this.removeFile(file.name)
    }

    for (const file of diffs.delete.filter((item) => item.type === 'folder')) {
      await this.removeFolder(file.name)
    }

    this.logger.all(
      `----------------------------------------------------------------`
    )
    this.logger.all(
      `🎉 Sync complete. Saving current server state to "${this.serverPath + this.stateName}"`
    )
    if (this.dryRun === false) {
      await retryRequest(
        this.logger,
        async () =>
          await this.client.fastPut(
            this.localPath + this.stateName,
            this.stateName
          )
      )
    }
  }
}
