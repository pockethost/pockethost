import { binFor } from '@pockethost/common'
import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_PORT_BASE,
  DAEMON_PB_USERNAME,
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from '../constants'
import { createPbClient, PocketbaseClientApi } from '../db/PbClient'
import { mkInternalUrl } from '../util/internal'
import { tryFetch } from '../util/tryFetch'
import { _spawn } from '../util/_spawn'
import { schema } from './schema'

export const applyDbMigrations = async (
  cb: (client: PocketbaseClientApi) => void
) => {
  // Add `platform` and `bin` required columns (migrate db json)
  try {
    const mainProcess = await _spawn({
      subdomain: PUBLIC_PB_SUBDOMAIN,
      slug: PUBLIC_PB_SUBDOMAIN,
      port: DAEMON_PB_PORT_BASE,
      bin: binFor('lollipop'),
    })
    try {
      const coreInternalUrl = mkInternalUrl(DAEMON_PB_PORT_BASE)
      const client = createPbClient(coreInternalUrl)
      await tryFetch(coreInternalUrl)
      await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
      await client.applySchema(schema)
      await cb(client)
    } catch (e) {
      console.error(
        `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_PB_PROTOCOL}://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}/_/`
      )
      console.error(
        `***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`
      )
    } finally {
      console.log(`Exiting process`)
      mainProcess.kill()
    }
  } catch (e) {
    console.error(`${e}`)
  }
}
