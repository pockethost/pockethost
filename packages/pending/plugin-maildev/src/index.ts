import MailDev from 'maildev'
import {
  APEX_DOMAIN,
  Command,
  IS_DEV,
  LoggerService,
  PocketHostFilter,
  PocketHostPlugin,
} from 'pockethost/core'

const maildev = new MailDev({})

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  if (!IS_DEV()) return
  const logger = LoggerService().create('MailDevPlugin')
  const { dbg } = logger

  registerFilter(PocketHostFilter.Firewall_HostnameRoutes, async (routes) => {
    return {
      ...routes,
      [`mail.${APEX_DOMAIN()}`]: `http://localhost:${1080}`,
    }
  })

  registerFilter(PocketHostFilter.Core_CliCommands, async (commands) => {
    return [...commands, MailDevCommand()]
  })

  const MailDevCommand = () => {
    const cmd = new Command(`maildev`)
      .description(`maildev commands`)
      .addCommand(
        new Command(`serve`)
          .description(`Run a local mail server for development purposes`)
          .action(async (options) => {
            maildev.listen()

            maildev.on('new', function (email) {
              dbg(email)
            })
          }),
      )

    return cmd
  }
}

export default plugin
