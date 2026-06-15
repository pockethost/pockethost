import fs from 'fs'
import SftpClient from 'ssh2-sftp-client'
import {
  IFileList,
  IDiff,
  syncFileDescription,
  currentSyncFileVersion,
  IFtpDeployArgumentsWithDefaults,
} from './types'
import { HashDiff } from './HashDiff'
import {
  ILogger,
  retryRequest,
  ITimings,
  applyExcludeFilter,
  formatNumber,
} from './utilities'
import prettyBytes from 'pretty-bytes'
import { prettyError } from './errorHandling'
import { ensureSftpDir, SFTPSyncProvider } from './sftpSyncProvider'
import { getLocalFiles } from './localFiles'
import { readPrivateKeyForSsh2 } from './sshPrivateKey'

async function downloadFileList(
  client: SftpClient,
  logger: ILogger,
  path: string
): Promise<IFileList> {
  const tempFileNameHack =
    '.ftp-deploy-sync-server-state-buffer-file---delete.json'

  await retryRequest(
    logger,
    async () => await client.fastGet(path, tempFileNameHack)
  )

  const fileAsString = fs.readFileSync(tempFileNameHack, { encoding: 'utf-8' })
  const fileAsObject = JSON.parse(fileAsString) as IFileList

  fs.unlinkSync(tempFileNameHack)

  return fileAsObject
}

function createLocalState(
  localFiles: IFileList,
  logger: ILogger,
  args: IFtpDeployArgumentsWithDefaults
): void {
  logger.verbose(
    `Creating local state at ${args['local-dir']}${args['state-name']}`
  )
  fs.writeFileSync(
    `${args['local-dir']}${args['state-name']}`,
    JSON.stringify(localFiles, undefined, 4),
    {
      encoding: 'utf8',
    }
  )
  logger.verbose('Local state created')
}

async function connect(
  client: SftpClient,
  args: IFtpDeployArgumentsWithDefaults,
  logger: ILogger
) {
  if (!args['private-key-path']) {
    throw new Error(`SFTP deploy requires "private-key-path"`)
  }

  const privateKey = readPrivateKeyForSsh2(args['private-key-path'])

  try {
    await client.connect({
      host: args.server,
      port: args.port,
      username: args.username,
      privateKey,
      readyTimeout: args.timeout,
    })
  } catch (error) {
    logger.all(
      'Failed to connect over SFTP. Check host, port, username, and deploy key registration.'
    )
    throw error
  }

  const serverDir = args['server-dir'].replace(/\/$/, '') || '.'
  await retryRequest(logger, async () => await client.realPath(serverDir))
}

async function getServerFiles(
  client: SftpClient,
  logger: ILogger,
  timings: ITimings,
  args: IFtpDeployArgumentsWithDefaults
): Promise<IFileList> {
  try {
    await ensureSftpDir(client, logger, timings, '.')

    if (args['dangerous-clean-slate']) {
      logger.all(
        `----------------------------------------------------------------`
      )
      logger.all(
        "🗑️ Removing all files on the server because 'dangerous-clean-slate' was set, this will make the deployment very slow..."
      )
      if (args['dry-run'] === false) {
        const entries = await client.list('.')
        for (const entry of entries) {
          if (entry.name === '.' || entry.name === '..') continue
          if (entry.type === 'd') {
            await client.rmdir(entry.name, true)
          } else {
            await client.delete(entry.name)
          }
        }
      }
      logger.all('Clear complete')

      throw new Error('dangerous-clean-slate was run')
    }

    const serverFiles = await downloadFileList(
      client,
      logger,
      args['state-name']
    )
    logger.all(
      `----------------------------------------------------------------`
    )
    logger.all(
      `Last published on 📅 ${new Date(
        serverFiles.generatedTime
      ).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })}`
    )

    if (args.exclude.length > 0) {
      const filteredData = serverFiles.data.filter((item) =>
        applyExcludeFilter(
          { path: item.name, isDirectory: () => item.type === 'folder' },
          args.exclude
        )
      )
      serverFiles.data = filteredData
    }

    return serverFiles
  } catch (error) {
    logger.all(
      `----------------------------------------------------------------`
    )
    logger.all(
      `No file exists on the server "${args['server-dir'] + args['state-name']}" - this must be your first publish! 🎉`
    )
    logger.all(
      `The first publish will take a while... but once the initial sync is done only differences are published!`
    )
    logger.all(
      `If you get this message and its NOT your first publish, something is wrong.`
    )

    return {
      description: syncFileDescription,
      version: currentSyncFileVersion,
      generatedTime: new Date().getTime(),
      data: [],
    }
  }
}

export async function deploySftp(
  args: IFtpDeployArgumentsWithDefaults,
  logger: ILogger,
  timings: ITimings
): Promise<void> {
  timings.start('total')

  logger.all(`----------------------------------------------------------------`)
  logger.all(`🚀 Thanks for using ftp-deploy. Let's deploy some stuff!   `)
  logger.all(`----------------------------------------------------------------`)
  logger.verbose(
    `Using the following include filters: ${JSON.stringify(args.include)}`
  )
  logger.verbose(
    `Using the following excludes filters: ${JSON.stringify(args.exclude)}`
  )

  timings.start('hash')
  const localFiles = await getLocalFiles(args, logger)
  timings.stop('hash')

  createLocalState(localFiles, logger, args)

  const client = new SftpClient()

  let totalBytesUploaded = 0
  try {
    timings.start('connecting')
    await connect(client, args, logger)
    timings.stop('connecting')

    const serverFiles = await getServerFiles(client, logger, timings, args)

    timings.start('logging')
    const diffTool: IDiff = new HashDiff()

    logger.standard(
      `----------------------------------------------------------------`
    )
    logger.standard(`Local Files:\t${formatNumber(localFiles.data.length)}`)
    logger.standard(`Server Files:\t${formatNumber(serverFiles.data.length)}`)
    logger.standard(
      `----------------------------------------------------------------`
    )
    logger.standard(`Calculating differences between client & server`)
    logger.standard(
      `----------------------------------------------------------------`
    )
    logger.verbose(`Local files:`, JSON.stringify(localFiles, null, 2))
    logger.verbose(`Server files:`, JSON.stringify(serverFiles, null, 2))

    const diffs = diffTool.getDiffs(localFiles, serverFiles)

    diffs.upload
      .filter((itemUpload) => itemUpload.type === 'folder')
      .map((itemUpload) => {
        logger.standard(`📁 Create: ${itemUpload.name}`)
      })

    diffs.upload
      .filter((itemUpload) => itemUpload.type === 'file')
      .map((itemUpload) => {
        logger.standard(`📄 Upload: ${itemUpload.name}`)
      })

    diffs.replace.map((itemReplace) => {
      logger.standard(`🔁 File replace: ${itemReplace.name}`)
    })

    diffs.delete
      .filter((itemUpload) => itemUpload.type === 'file')
      .map((itemDelete) => {
        logger.standard(`📄 Delete: ${itemDelete.name}    `)
      })

    diffs.delete
      .filter((itemUpload) => itemUpload.type === 'folder')
      .map((itemDelete) => {
        logger.standard(`📁 Delete: ${itemDelete.name}    `)
      })

    diffs.same.map((itemSame) => {
      if (itemSame.type === 'file') {
        logger.standard(
          `⚖️  File content is the same, doing nothing: ${itemSame.name}`
        )
      }
    })
    timings.stop('logging')

    totalBytesUploaded = diffs.sizeUpload + diffs.sizeReplace

    timings.start('upload')
    try {
      const syncProvider = new SFTPSyncProvider(
        client,
        logger,
        timings,
        args['local-dir'],
        args['server-dir'],
        args['state-name'],
        args['dry-run']
      )
      await syncProvider.syncLocalToServer(diffs)
    } finally {
      timings.stop('upload')
    }
  } catch (error) {
    prettyError(logger, args, error)
    throw error
  } finally {
    await client.end()
    timings.stop('total')
  }

  const uploadSpeed = prettyBytes(
    totalBytesUploaded / (timings.getTime('upload') / 1000)
  )

  logger.all(`----------------------------------------------------------------`)
  logger.all(`Time spent hashing: ${timings.getTimeFormatted('hash')}`)
  logger.all(
    `Time spent connecting to server: ${timings.getTimeFormatted('connecting')}`
  )
  logger.all(
    `Time spent deploying: ${timings.getTimeFormatted('upload')} (${uploadSpeed}/second)`
  )
  logger.all(`  - changing dirs: ${timings.getTimeFormatted('changingDir')}`)
  logger.all(`  - logging: ${timings.getTimeFormatted('logging')}`)
  logger.all(`----------------------------------------------------------------`)
  logger.all(`Total time: ${timings.getTimeFormatted('total')}`)
  logger.all(`----------------------------------------------------------------`)
}
