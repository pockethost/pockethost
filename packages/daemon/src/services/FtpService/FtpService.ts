import {
  PH_FTP_PASV_IP,
  PH_FTP_PASV_PORT_MAX,
  PH_FTP_PASV_PORT_MIN,
  PH_FTP_PORT,
  SSL_CERT,
  SSL_KEY,
} from '$constants'
import { clientService, createPbClient } from '$services'
import { mkSingleton, SingletonBaseConfig } from '@pockethost/common'
import { readFileSync } from 'fs'
import { FtpSrv } from 'ftp-srv'
import { PhFs } from './PhFs'

export type FtpConfig = SingletonBaseConfig & {}

export enum FolderNames {
  PbData = 'pb_data',
  PbStatic = 'pb_static',
  PbMigrations = 'pb_migrations',
  PbWorker = 'worker',
  PbBackup = 'backup',
}

export const README_CONTENTS: { [_ in FolderNames]: string } = {
  [FolderNames.PbBackup]: `This directory contains tgz backups of your data. PocketHost creates these automatically, or you can create them manually. For more information, see https://pockethost.io/docs/backups`,
  [FolderNames.PbData]: `This directory contains your PocketBase data. For more information, see https://pockethost.io/docs/data`,
  [FolderNames.PbStatic]: `This directory contains static files such as your web frontend. PocketHost will serve these when your instance URL receives a request. For more information, see https://pockethost.io/docs/static `,
  [FolderNames.PbWorker]: `This directory contains your Deno worker. For more information, see https://pockethost.io/docs/workers`,
  [FolderNames.PbMigrations]: `This directory contains your migrations. For more information, see https://pockethost.io/docs/migrations`,
}
export const README_NAME = 'readme.md'

export const FOLDER_NAMES: FolderNames[] = [
  FolderNames.PbBackup,
  FolderNames.PbData,
  FolderNames.PbStatic,
  FolderNames.PbWorker,
  FolderNames.PbMigrations,
]

export function isFolder(name: string): name is FolderNames {
  return FOLDER_NAMES.includes(name as FolderNames)
}

const tls = {
  key: readFileSync(SSL_KEY || ''),
  cert: readFileSync(SSL_CERT || ''),
}

export const ftpService = mkSingleton((config: FtpConfig) => {
  const { logger } = config
  const _ftpServiceLogger = logger.create('FtpService')
  const { dbg, info } = _ftpServiceLogger

  const ftpServer = new FtpSrv({
    url: 'ftp://0.0.0.0:' + PH_FTP_PORT,
    anonymous: false,
    log: _ftpServiceLogger.create(`ftpServer`, { errorTrace: false }),
    tls,
    pasv_url: PH_FTP_PASV_IP,
    pasv_max: PH_FTP_PASV_PORT_MAX,
    pasv_min: PH_FTP_PASV_PORT_MIN,
  })

  ftpServer.on(
    'login',
    async ({ connection, username, password }, resolve, reject) => {
      const url = (await clientService()).client.url
      const client = createPbClient(url, _ftpServiceLogger)
      try {
        await client.client
          .collection('users')
          .authWithPassword(username, password)
        dbg(`Logged in`)
        const fs = new PhFs(connection, client, _ftpServiceLogger)
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
