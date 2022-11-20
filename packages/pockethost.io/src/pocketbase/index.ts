import { browser, dev } from '$app/environment'
import { PUBLIC_PB_DOMAIN, PUBLIC_PB_SUBDOMAIN } from '$src/env'
import { createLogger, createPromiseHelper } from '@pockethost/common'
import { createPocketbaseClient, type PocketbaseClient } from './PocketbaseClient'

export const client = (() => {
  let clientInstance: PocketbaseClient | undefined
  return () => {
    if (!browser) throw new Error(`PocketBase client not supported in SSR`)
    if (clientInstance) return clientInstance
    const logger = createLogger({ debug: dev })
    logger.info(`Initializing pocketbase client`)
    const url = `https://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}`
    const promiseHelper = createPromiseHelper({ logger })
    clientInstance = createPocketbaseClient({ url, logger, promiseHelper })
    return clientInstance
  }
})()
