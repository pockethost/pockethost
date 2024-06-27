import { info } from 'console'
import { PocketHostPlugin, onIncomingRequestAction } from 'pockethost'
import { PLUGIN_NAME } from './constants'
import { dbg } from './log'

const plugin: PocketHostPlugin = async ({}) => {
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
}

export default plugin
