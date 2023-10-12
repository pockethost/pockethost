import { browser } from '$app/environment'
import { MOTHERSHIP_URL } from '$src/env'
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
    const url = MOTHERSHIP_URL
    clientInstance = createPocketbaseClient({ url })
    return clientInstance
  }
})()
