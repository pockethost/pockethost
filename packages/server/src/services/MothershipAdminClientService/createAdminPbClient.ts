import { Logger, PocketBase, adminAuthWithPassword, createFirstAdmin as createFirstAdminRecord } from '@'

export type PocketbaseClientApi = ReturnType<typeof createAdminPbClient>

export const createAdminPbClient = (url: string, logger: Logger) => {
  const _clientLogger = logger.create('PbClient')
  const { info } = _clientLogger

  info(`Initializing client: ${url}`)

  const client = new PocketBase(url)
  client.autoCancellation(false)

  const adminAuthViaEmail = (email: string, password: string) => adminAuthWithPassword(client, email, password)

  const createFirstAdmin = (email: string, password: string) => createFirstAdminRecord(client, email, password)

  const api = {
    client,
    url,
    createFirstAdmin,
    adminAuthViaEmail,
  }

  return api
}
