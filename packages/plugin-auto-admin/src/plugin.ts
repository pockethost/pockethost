import PocketBase from 'pocketbase'
import {
  PocketHostPlugin,
  onAfterInstanceStartedAction,
  onSettingsFilter,
  parseError,
} from 'pockethost'
import { LOGIN, PASSWORD, PLUGIN_NAME, settings } from './constants'
import { dbg, info } from './log'

export const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  onAfterInstanceStartedAction(async ({ instance, url }) => {
    const { subdomain } = instance
    dbg(`launched instance ${instance.subdomain} on ${url}`)
    const client = new PocketBase(url)
    const email = LOGIN()
    const password = PASSWORD()
    try {
      await client.admins.create({ email, password, passwordConfirm: password })
      dbg(`Admin account created`)
    } catch (e: any) {
      dbg(`Failed to create admin account: ${parseError(e)} `)
    } finally {
      info(`Default admin login for ${subdomain} is ${email}/${password}`)
    }
  })

  onSettingsFilter(async (allSettings) => ({ ...allSettings, ...settings }))
}
