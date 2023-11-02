import { LoggerService } from '$shared'
import { PUBLIC_MOTHERSHIP_URL } from '$src/env'
import {
  createPocketbaseClient,
  type PocketbaseClient,
} from './PocketbaseClient'

export const client = (() => {
  let clientInstance: PocketbaseClient | undefined
  return () => {
    if (clientInstance) return clientInstance
    const { info } = LoggerService()
    info(`Initializing pocketbase client`)
    const url = PUBLIC_MOTHERSHIP_URL
    clientInstance = createPocketbaseClient({ url })
    return clientInstance
  }
})()
