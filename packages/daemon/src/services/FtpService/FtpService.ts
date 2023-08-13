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
  PbPublic = 'pb_public',
  PbMigrations = 'pb_migrations',
  PbHooks = 'pb_hooks',
  PbWorker = 'worker',
}

export const MAINTENANCE_ONLY_FOLDER_NAMES: FolderNames[] = [FolderNames.PbData]
export const RESTART_ON_WRITE: FolderNames[] = [
  FolderNames.PbMigrations,
  FolderNames.PbHooks,
  FolderNames.PbWorker,
]

export const INSTANCE_ROOT_FOLDER_NAMES: FolderNames[] = [
  FolderNames.PbData,
  FolderNames.PbPublic,
  FolderNames.PbWorker,
  FolderNames.PbMigrations,
  FolderNames.PbHooks,
]

export function isInstanceRootFolder(name: string): name is FolderNames {
  return INSTANCE_ROOT_FOLDER_NAMES.includes(name as FolderNames)
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
        return
      }
    }
  )

  ftpServer.listen().then(() => {
    info('Ftp server started...')
  })

  const shutdown = () => {
    info(`Closing FTP server`)
    ftpServer.close()
  }

  return { shutdown }
})
