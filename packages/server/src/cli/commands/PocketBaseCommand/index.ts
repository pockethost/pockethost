import { Command } from 'commander'
import { CheckCommand } from './CheckCommand'
import { UpdateCommand } from './UpdateCommand'

export const PocketBaseCommand = () => {
  const cmd = new Command(`pocketbase`).description(`PocketBase commands`)

  cmd
    .addCommand(UpdateCommand())
    .addCommand(CheckCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
