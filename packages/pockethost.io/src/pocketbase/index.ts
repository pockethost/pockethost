import { PUBLIC_PB_DOMAIN, PUBLIC_PB_SUBDOMAIN } from '$env/static/public'
import { createPocketbaseClient } from './PocketbaseClient'

const url = `https://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}`
const client = createPocketbaseClient(url)

export { client }
