import { logger, mkSingleton } from '@pockethost/common'
import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_USERNAME,
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from '../constants'
import { createPbClient } from './PbClient'

export const clientService = mkSingleton(async (url: string) => {
  const { dbg, error } = logger().create(`client singleton`)
  const client = createPbClient(url)
  try {
    await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
    dbg(`Logged in`)
  } catch (e) {
    error(
      `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_PB_PROTOCOL}://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}/_/`
    )
    error(`***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`)
  }
  return client
})
