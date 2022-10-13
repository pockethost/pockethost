import { PUBLIC_APP_DOMAIN, PUBLIC_CORE_PB_SUBDOMAIN } from '$env/static/public'
import { createPocketbaseClient } from '@pockethost/common'

const url = `https://${PUBLIC_CORE_PB_SUBDOMAIN}.${PUBLIC_APP_DOMAIN}`
const client = createPocketbaseClient(url)

export { client }
