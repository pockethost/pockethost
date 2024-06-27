import { readFileSync } from 'fs'
import { FtpSrv } from 'ftp-srv'
import { keys, values } from 'pockethost/core'
import {
  LoggerService,
  PocketBase,
  PocketHostFilter,
  filter,
  mkSingleton,
} from 'pockethost/src/common'
import { asyncExitHook } from 'pockethost/src/core'
import {
  PASV_IP,
  PASV_PORT_MAX,
  PASV_PORT_MIN,
  PORT,
  SSL_CERT,
  SSL_KEY,
} from '../..'
import { PhFs } from './PhFs'

export type FtpConfig = {}

export enum VirtualFolderNames {
  Data = 'pb_data',
  Public = 'pb_public',
  Migrations = 'pb_migrations',
  Hooks = 'pb_hooks',
}

export enum PhysicalFolderNames {
  Data = 'pb_data',
  Public = 'pb_public',
  Migrations = 'pb_migrations',
  Hooks = 'pb_hooks',
}
export const MAINTENANCE_ONLY_FOLDER_NAMES: VirtualFolderNames[] = [
  VirtualFolderNames.Data,
]

export const FolderNamesMap: {
  [_ in VirtualFolderNames]: PhysicalFolderNames
} = {
  [VirtualFolderNames.Data]: PhysicalFolderNames.Data,
  [VirtualFolderNames.Public]: PhysicalFolderNames.Public,
  [VirtualFolderNames.Migrations]: PhysicalFolderNames.Migrations,
  [VirtualFolderNames.Hooks]: PhysicalFolderNames.Hooks,
} as const

export const INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES = keys(FolderNamesMap)
export const INSTANCE_ROOT_PHYSICAL_FOLDER_NAMES = values(FolderNamesMap)

export function isInstanceRootVirtualFolder(
  name: string,
): name is VirtualFolderNames {
  return INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES.includes(name as VirtualFolderNames)
}

export function virtualFolderGuard(
  name: string,
): asserts name is VirtualFolderNames {
  if (!isInstanceRootVirtualFolder(name)) {
    throw new Error(`Accessing ${name} is not allowed.`)
  }
}

export const ftpService = mkSingleton((config: Partial<FtpConfig> = {}) => {
  const tls = {
    key: readFileSync(SSL_KEY()),
    cert: readFileSync(SSL_CERT()),
  }
  const _ftpServiceLogger = LoggerService().create('FtpService')
  const { dbg, info } = _ftpServiceLogger

  const ftpServer = new FtpSrv({
    url: 'ftp://0.0.0.0:' + PORT(),
    anonymous: false,
    log: _ftpServiceLogger.create(`ftpServer`),
    tls,
    pasv_url: PASV_IP(),
    pasv_max: PASV_PORT_MAX(),
    pasv_min: PASV_PORT_MIN(),
  })

  ftpServer.on(
    'login',
    async ({ connection, username, password }, resolve, reject) => {
      dbg(`Got a connection`)
      dbg(`Finding ${username}`)
      const client = new PocketBase(
        await filter<string>(
          PocketHostFilter.Mothership_MothershipPublicUrl,
          ``,
        ),
      )
      try {
        await client.collection('users').authWithPassword(username, password)
        dbg(`Logged in`)
        const fs = new PhFs(connection, client, _ftpServiceLogger)
        resolve({ fs })
      } catch (e) {
        reject(new Error(`Invalid username or password`))
        return
      }
    },
  )

  ftpServer.listen().then(() => {
    dbg('Ftp server started...')
  })

  asyncExitHook(async () => {
    dbg(`Closing FTP server`)
    ftpServer.close()
  })

  return {}
})
