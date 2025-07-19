import { Command } from 'commander'
import { SendMailCommand } from './sendmail'

type Options = {
  debug: boolean
}

export const MailCommand = () => {
  const cmd = new Command(`mail`).description(`PocketHost bulk mail`).addCommand(SendMailCommand())

  return cmd
}
