import { info } from 'console'
import {
  PocketHostPlugin,
  onIncomingRequestAction,
  onSettingsFilter,
} from 'pockethost'
import { PLUGIN_NAME, settings } from './constants'
import { dbg } from './log'

export const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  onIncomingRequestAction(async ({ req, res }) => {
    const url = new URL(`http://${req.headers.host}${req.url}`)
    const country = (req.headers['cf-ipcountry'] as string) || '<ct>'
    const ip = (req.headers['x-forwarded-for'] as string) || '<ip>'
    const method = req.method || '<m>'
    const sig = [
      method.padStart(10),
      country.padStart(5),
      ip.padEnd(45),
      url.toString(),
    ].join(' ')
    info(`Incoming request ${sig}`)
    res.locals.sig = sig
  })

  onSettingsFilter(async (allSettings) => ({ ...allSettings, ...settings }))
}
