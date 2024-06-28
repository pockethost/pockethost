import { Command } from 'commander'
import { produce } from 'immer'
import MailDev from 'maildev'
import {
  IS_DEV,
  PocketHostPlugin,
  onCliCommandsFilter,
  onInstanceConfigFilter,
  onServeAction,
  onServeSlugsFilter,
} from 'pockethost'
import { PLUGIN_NAME, PORT, PROJECT_DIR, WEB_ADMIN_PORT } from './constants'
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

  onInstanceConfigFilter(async (config) => {
    return produce(config, (draft) => {
      draft.env.PH_MAILDEV_PORT = PORT().toString()
      draft.binds.hooks.push({
        src: PROJECT_DIR(`src/instance-app/hooks/**/*`),
        base: PROJECT_DIR(`src/instance-app/hooks`),
      })
    })
  })

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
