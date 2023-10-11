import { browser } from '$app/environment'
import { HTTP_PROTOCOL, MOTHERSHIP_DOMAIN } from '$src/env'
import { LoggerService } from '@pockethost/common'
import {
  createPocketbaseClient,
  type PocketbaseClient,
} from './PocketbaseClient'

export const client = (() => {
  let clientInstance: PocketbaseClient | undefined
  return () => {
    if (!browser) throw new Error(`PocketBase client not supported in SSR`)
    if (clientInstance) return clientInstance
    const { info } = LoggerService()
    info(`Initializing pocketbase client`)
    const url = `${HTTP_PROTOCOL}://${MOTHERSHIP_DOMAIN}`
    clientInstance = createPocketbaseClient({ url })
    return clientInstance
  }
})()
