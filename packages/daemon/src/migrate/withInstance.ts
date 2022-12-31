import { createPbClient, pocketbase, PocketbaseClientApi } from '$services'
import { logger, safeCatch } from '@pockethost/common'
import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_USERNAME,
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from '../constants'

export const withInstance = safeCatch(
  `withInstance`,
  async (cb: (client: PocketbaseClientApi) => Promise<void>) => {
    const { info, error } = logger().create('withInstance')

    // Add `platform` and `bin` required columns (migrate db json)
    try {
      const mainProcess = await (
        await pocketbase()
      ).spawn({
        command: 'serve',
        slug: PUBLIC_PB_SUBDOMAIN,
      })

      try {
        const { url } = mainProcess
        const client = createPbClient(url)
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
        await mainProcess.exited
      }
    } catch (e) {
      error(`${e}`)
    }
  }
)
