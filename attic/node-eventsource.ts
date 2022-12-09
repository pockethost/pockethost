import EventSourceClass from 'eventsource'
import PocketBase from 'pocketbase'

require('ssl-root-cas')
  .inject()
  .addFile(__dirname + '/packages/docker/src/nginx/ssl/ca.crt')

global.EventSource = EventSourceClass

const POCKETBASE_URL = 'https://able-actor.pockethost.test'
const ADMIN_LOGIN = 'able-actor@benallfree.com'
const ADMIN_PASSWORD = 'zpA6w9DXYYECj4Y'

if (!POCKETBASE_URL) {
  throw new Error(`POCKETBASE_URL must be defined.`)
}

if (!ADMIN_LOGIN) {
  throw new Error(`ADMIN_LOGIN must be defined.`)
}

if (!ADMIN_PASSWORD) {
  throw new Error(`ADMIN_PASSWORD must be defined.`)
}

;(async () => {
  console.log(`Connecting to ${POCKETBASE_URL} with ${ADMIN_LOGIN}`)
  const client = new PocketBase(POCKETBASE_URL)
  try {
    await client.admins.authWithPassword(ADMIN_LOGIN, ADMIN_PASSWORD)
    console.log(`Successfully logged in.`)
    await client.collection('orders').subscribe('*', (data) => {
      console.log(`Got a data record`, data)
    })
    console.log(`Watching orders`)
  } catch (e) {
    console.error(e, JSON.stringify(e))
  }
})()
