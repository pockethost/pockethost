import { Command } from 'commander'
import { UpdateCommand } from './UpdateCommand'

export const GobotCommand = () => {
  const cmd = new Command(`gobot`).description(`Gobot commands`)

  cmd.addCommand(UpdateCommand())
  return cmd
}
