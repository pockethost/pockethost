import { Command } from 'commander'
import { freshenPocketbaseVersions } from './freshenPocketbaseVersions'

export const UpdateCommand = () => {
  const cmd = new Command(`update`)
    .description(`Update all Gobot dependencies`)
    .action(async (options) => {
      await freshenPocketbaseVersions()
    })
  return cmd
}
