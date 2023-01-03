// import { EventSource as EventSourceClass } from 'https://cdn.jsdelivr.net/gh/MierenManz/EventSource@53f3ec9001d1eac19645c2214652a6a7aa3a51cb/mod.ts'
// @deno-types="./index.d.ts"
import EventSourceClass from './EventSource2.js'
// @deno-types="https://cdn.jsdelivr.net/npm/pocketbase/dist/pocketbase.es.d.ts"
import PocketBase from 'https://cdn.jsdelivr.net/npm/pocketbase'
declare global {
  // deno-lint-ignore no-var
  var EventSource: typeof EventSourceClass
}

globalThis.EventSource = EventSourceClass

export const init = (klass: typeof PocketBase) => {
  const POCKETBASE_URL = Deno.env.get('POCKETBASE_URL')
  const ADMIN_LOGIN = Deno.env.get('ADMIN_LOGIN') || ''
  const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || ''

  if (!POCKETBASE_URL) {
    throw new Error(`POCKETBASE_URL must be defined.`)
  }

  const client = new klass(POCKETBASE_URL)

  const adminAuthWithPassword = async (
    login = ADMIN_LOGIN,
    password = ADMIN_PASSWORD
  ) => {
    console.log(`Connecting to ${POCKETBASE_URL} with ${ADMIN_LOGIN}`)
    await client.admins.authWithPassword(login, password)
    console.log(`Successfully logged in as ${ADMIN_LOGIN}.`)
    return client
  }

  return {
    adminAuthWithPassword,
    client,
  }
}
