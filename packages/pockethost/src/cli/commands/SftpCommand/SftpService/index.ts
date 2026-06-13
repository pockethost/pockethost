import {
  MOTHERSHIP_URL,
  PH_SFTP_HOST_KEY,
  PH_SFTP_PORT,
  SingletonBaseConfig,
  asyncExitHook,
  authenticateFileAccess,
  logger,
  mergeConfig,
  mkSingleton,
} from '@'
import ssh2 from 'ssh2'
import { InstanceVfs } from '../../../../services/InstanceFileAccess/InstanceVfs'
import { ensureHostKey } from './hostKey'
import { attachSftpSession } from './SftpSession'

export type SftpConfig = SingletonBaseConfig & { mothershipUrl: string }

export const sftpService = mkSingleton((config: SftpConfig) => {
  const { mothershipUrl } = mergeConfig(
    {
      mothershipUrl: MOTHERSHIP_URL(),
    },
    config
  )
  const _sftpServiceLogger = logger()
  const { dbg, info } = _sftpServiceLogger

  const hostKey = ensureHostKey(PH_SFTP_HOST_KEY())

  const server = new ssh2.Server(
    {
      hostKeys: [hostKey],
    },
    (client) => {
      let username = ``
      client
        .on('authentication', (ctx) => {
          if (ctx.method !== 'password') {
            return ctx.reject(['password'])
          }
          username = ctx.username
          authenticateFileAccess(mothershipUrl, ctx.username, ctx.password)
            .then((pb) => {
              ;(client as typeof client & { _pbClient?: typeof pb })._pbClient = pb
              ctx.accept()
            })
            .catch(() => ctx.reject(['password']))
        })
        .on('ready', () => {
          dbg(`Client authenticated`, { username })
          client.on('session', (accept) => {
            const session = accept()
            session.on('sftp', (accept, reject) => {
              const pb = (client as typeof client & { _pbClient?: Awaited<ReturnType<typeof authenticateFileAccess>> })
                ._pbClient
              if (!pb) {
                reject()
                return
              }
              const sftp = accept()
              const vfs = new InstanceVfs(pb, _sftpServiceLogger.child(username).context({ sftpSession: Date.now() }))
              attachSftpSession(sftp, vfs, _sftpServiceLogger.child(username))
            })
          })
        })
        .on('close', () => {
          dbg(`Client disconnected`, { username })
        })
    }
  )

  server.listen(PH_SFTP_PORT(), '0.0.0.0', () => {
    info(`SFTP server listening on port ${PH_SFTP_PORT()}`)
  })

  asyncExitHook(async () => {
    dbg(`Closing SFTP server`)
    server.close()
  })

  return {}
})
