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
import { error, info } from '../util/logger'
import { safeCatch } from '../util/promiseHelper'
import { spawnInstance } from '../util/spawnInstance'
import { tryFetch } from '../util/tryFetch'

export const withInstance = safeCatch(
  `withInstance`,
  async (cb: (client: PocketbaseClientApi) => Promise<void>) => {
    // Add `platform` and `bin` required columns (migrate db json)
    try {
      const mainProcess = await spawnInstance({
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
        await cb(client)
      } catch (e) {
        error(
          `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_PB_PROTOCOL}://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}/_/`
        )
        error(`***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`)
      } finally {
        info(`Exiting process`)
        mainProcess.kill()
      }
    } catch (e) {
      error(`${e}`)
    }
  }
)
