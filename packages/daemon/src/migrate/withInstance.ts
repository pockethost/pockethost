import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_USERNAME,
  PUBLIC_APP_DB,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
} from '$constants'
import { createPbClient, pocketbase, PocketbaseClientApi } from '$services'
import { logger, safeCatch } from '@pockethost/common'

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
        slug: PUBLIC_APP_DB,
      })

      try {
        const { url } = mainProcess
        const client = createPbClient(url)
        await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
        await cb(client)
      } catch (e) {
        error(
          `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DB}.${PUBLIC_APP_DOMAIN}/_/`
        )
        error(`***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`)
        process.exit(-1)
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
