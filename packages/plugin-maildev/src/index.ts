import { Command } from 'commander'
import MailDev from 'maildev'
import {
  IS_DEV,
  PocketHostPlugin,
  onCliCommandsFilter,
  onServeAction,
  onServeSlugsFilter,
} from 'pockethost'
import { PLUGIN_NAME, PORT, WEB_ADMIN_PORT } from './constants'
import { dbg } from './log'

const serve = () => {
  const maildev = new MailDev({ smtp: PORT(), web: WEB_ADMIN_PORT() })

  maildev.listen()

  maildev.on('new', function (email) {
    dbg(email)
  })
}

const MailDevCommand = () => {
  const cmd = new Command(`maildev`).description(`maildev commands`).addCommand(
    new Command(`serve`)
      .description(`Run a local mail server for development purposes`)
      .action(async (options) => {
        serve()
      }),
  )

  return cmd
}

const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  if (!IS_DEV()) return

  // registerFilter(PocketHostFilter.Firewall_HostnameRoutes, async (routes) => {
  //   return {
  //     ...routes,
  //     [`mail.${APEX_DOMAIN()}`]: `http://localhost:${1080}`,
  //   }
  // })

  onCliCommandsFilter(async (commands) => {
    return [...commands, MailDevCommand()]
  })

  onServeSlugsFilter(async (slugs) => {
    return [...slugs, 'maildev']
  })

  onServeAction(async ({ only }) => {
    if (!only.includes('maildev')) return
    serve()
  })
}

export default plugin
