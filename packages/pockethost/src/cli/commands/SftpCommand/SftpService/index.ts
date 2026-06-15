import {
  asyncExitHook,
  classifySftpError,
  isUserError,
  logger,
  mergeConfig,
  mkSingleton,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  PH_SFTP_HOST_KEY,
  PH_SFTP_PORT,
  SingletonBaseConfig,
} from '@'
import ssh2 from 'ssh2'
import { InstanceVfs } from '../../../../services/InstanceFileAccess/InstanceVfs'
import type { SshKeyAuthResult } from '../../../../services/InstanceFileAccess/sshKeyAuth'
import { findSshKeyByPublicKey, verifySshPublicKeySignature } from '../../../../services/InstanceFileAccess/sshKeyAuth'
import { ensureHostKey } from './hostKey'
import { attachSftpSession } from './SftpSession'

export type SftpConfig = SingletonBaseConfig & { mothershipUrl: string }

type SftpClientState = {
  auth?: SshKeyAuthResult
}

export const sftpService = mkSingleton(async (config: SftpConfig) => {
  const { mothershipUrl } = mergeConfig(
    {
      mothershipUrl: MOTHERSHIP_URL(),
    },
    config
  )
  const _sftpServiceLogger = logger()
  const { dbg, info, error: logError } = _sftpServiceLogger

  const logSftpError = (err: unknown, context?: Record<string, unknown>) => {
    const classified = classifySftpError(err)
    if (isUserError(classified)) {
      dbg(`SFTP client error`, { ...context, message: classified.message })
      return
    }
    logError(classified, context)
  }

  const { client: adminApi } = await MothershipAdminClientService()
  const adminClient = adminApi.client

  const hostKey = ensureHostKey(PH_SFTP_HOST_KEY())

  const server = new ssh2.Server(
    {
      hostKeys: [hostKey],
    },
    (client) => {
      let username = ``
      const state: SftpClientState = {}

      client.on('error', (err) => {
        logSftpError(err, username ? { username } : undefined)
      })

      client
        .on('authentication', (ctx) => {
          if (ctx.method !== 'publickey') {
            return ctx.reject(['publickey'])
          }

          username = ctx.username
          const pkCtx = ctx as ssh2.PublicKeyAuthContext

          findSshKeyByPublicKey(adminClient, ctx.username, pkCtx.key.algo, pkCtx.key.data)
            .then((result) => {
              if (!result) {
                return ctx.reject(['publickey'])
              }

              if (!pkCtx.signature) {
                state.auth = result
                return ctx.accept()
              }

              if (
                !pkCtx.blob ||
                !verifySshPublicKeySignature(result.key.public_key, pkCtx.blob, pkCtx.signature, pkCtx.hashAlgo)
              ) {
                return ctx.reject(['publickey'])
              }

              state.auth = result
              ctx.accept()
            })
            .catch(() => ctx.reject(['publickey']))
        })
        .on('ready', () => {
          dbg(`Client authenticated`, { username, keyId: state.auth?.key.id })
          client.on('session', (accept) => {
            const session = accept()
            const endClient = () => client.end()
            session.on('end', endClient)
            session.on('close', endClient)
            session.on('eof', endClient)
            session.on('sftp', (accept, reject) => {
              const auth = state.auth
              if (!auth) {
                reject()
                return
              }

              const sftp = accept()
              const vfs = new InstanceVfs(
                adminClient,
                _sftpServiceLogger.child(username).context({ sftpSession: Date.now() }),
                {
                  userId: auth.user.id,
                  instanceIds: auth.instanceIds,
                }
              )
              attachSftpSession(sftp, vfs, _sftpServiceLogger.child(username))
            })
          })
        })
        .on('close', () => {
          dbg(`Client disconnected`, { username })
        })
    }
  )

  server.on('error', (err: Error) => {
    logSftpError(err)
  })

  server.listen(PH_SFTP_PORT(), '0.0.0.0', () => {
    info(`SFTP server listening on port ${PH_SFTP_PORT()}`)
  })

  asyncExitHook(async () => {
    dbg(`Closing SFTP server`)
    server.close()
  })

  return {}
})
