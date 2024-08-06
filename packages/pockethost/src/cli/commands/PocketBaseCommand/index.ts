import { Command } from 'commander'
import { UpdateCommand } from './UpdateCommand'

export const PocketBaseCommand = () => {
  const cmd = new Command(`pocketbase`).description(`PocketBase commands`)

  cmd.addCommand(UpdateCommand())
  return cmd
}
