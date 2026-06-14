import {
  MOTHERSHIP_URL,
  PH_FTP_PASV_IP,
  PH_FTP_PASV_PORT_MAX,
  PH_FTP_PASV_PORT_MIN,
  PH_FTP_PORT,
  SSL_CERT,
  SSL_KEY,
  SingletonBaseConfig,
  asyncExitHook,
  authenticateFileAccess,
  logger,
  mergeConfig,
  mkSingleton,
} from '@'
import { readFileSync } from 'fs'
import { FtpSrv } from 'ftp-srv'
import { PhFs } from './PhFs'

export type FtpConfig = SingletonBaseConfig & { mothershipUrl: string }

export const ftpService = mkSingleton((config: FtpConfig) => {
  const { mothershipUrl } = mergeConfig(
    {
      mothershipUrl: MOTHERSHIP_URL(),
    },
    config
  )
  const tls = {
    key: readFileSync(SSL_KEY()),
    cert: readFileSync(SSL_CERT()),
  }
  const _ftpServiceLogger = logger()
  const { dbg } = _ftpServiceLogger

  const ftpServer = new FtpSrv({
    url: 'ftp://0.0.0.0:' + PH_FTP_PORT(),
    anonymous: false,
    log: _ftpServiceLogger,
    tls,
    pasv_url: PH_FTP_PASV_IP(),
    pasv_max: PH_FTP_PASV_PORT_MAX(),
    pasv_min: PH_FTP_PASV_PORT_MIN(),
  })

  ftpServer.on('login', async ({ connection, username, password }, resolve, reject) => {
    dbg(`Got a connection with credentials ${username}:${password}`)
    dbg(`Finding ${mothershipUrl}`)
    try {
      const client = await authenticateFileAccess(mothershipUrl, username, password)
      dbg(`Logged in`)
      const fs = new PhFs(connection, client, _ftpServiceLogger.child(username).context({ ftpSession: Date.now() }))
      resolve({ fs })
    } catch (e) {
      reject(new Error(`Invalid username or password`))
      return
    }
  })

  ftpServer.listen().then(() => {
    dbg('Ftp server started...')
  })

  asyncExitHook(async () => {
    dbg(`Closing FTP server`)
    ftpServer.close()
  })

  return {}
})
