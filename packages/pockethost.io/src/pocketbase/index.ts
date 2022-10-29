import { browser } from '$app/environment'
import { PUBLIC_PB_DOMAIN, PUBLIC_PB_SUBDOMAIN } from '$src/env'
import { createPocketbaseClient, type PocketbaseClientApi } from './PocketbaseClient'

export const client = (() => {
  let clientInstance: PocketbaseClientApi | undefined
  return () => {
    if (!browser) throw new Error(`PocketBase client not supported in SSR`)
    if (clientInstance) return clientInstance
    console.log(`Initializing pocketbase client`)
    const url = `https://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}`
    clientInstance = createPocketbaseClient(url)
    return clientInstance
  }
})()
