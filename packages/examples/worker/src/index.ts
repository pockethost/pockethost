// import from 'https://raw.githubusercontent.com/benallfree/pockethost/deno-workers/packages/deno-worker/index.ts'
import { init } from '../../../deno-worker/index.ts'

// @deno-types="https://cdn.jsdelivr.net/npm/pocketbase/dist/pocketbase.es.d.ts"
import PocketBase from 'https://cdn.jsdelivr.net/npm/pocketbase'

const { client, adminAuthWithPassword } = init(PocketBase)

try {
  await adminAuthWithPassword()
  setInterval(() => {
    console.log(`ping`)
  }, 1000)
} catch (e) {
  console.error(`caught an error`, e, JSON.stringify(e))
}
