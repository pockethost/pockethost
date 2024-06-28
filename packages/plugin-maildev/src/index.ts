import { Command } from 'commander'
import MailDev from 'maildev'
import { PORT, WEB_ADMIN_PORT } from './constants'
import { dbg } from './log'
import { plugin } from './plugin'

export const serve = () => {
  const maildev = new MailDev({ smtp: PORT(), web: WEB_ADMIN_PORT() })

  maildev.listen()

  maildev.on('new', function (email) {
    dbg(email)
  })
}

export const MailDevCommand = () => {
  const cmd = new Command(`maildev`).description(`maildev commands`).addCommand(
    new Command(`serve`)
      .description(`Run a local mail server for development purposes`)
      .action(async (options) => {
        serve()
      }),
  )

  return cmd
}

export default plugin
