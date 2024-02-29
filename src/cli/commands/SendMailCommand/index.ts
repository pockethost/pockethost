import { LoggerService } from '$shared'
import { Command } from 'commander'
import { sendMail } from './sendmail'

type Options = {
  debug: boolean
}

export const SendMailCommand = () => {
  const cmd = new Command(`mail:send`)
    .description(`Send a PocketHost bulk mail`)
    .action(async (options: Options) => {
      const logger = LoggerService().create(`SendMailCommand`)
      const { dbg, error, info, warn } = logger
      info(`Starting`)

      await sendMail()
    })
  return cmd
}
