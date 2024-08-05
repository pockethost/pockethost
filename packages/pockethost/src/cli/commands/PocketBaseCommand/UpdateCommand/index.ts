import { Command } from 'commander'
import { freshenPocketbaseVersions } from './freshenPocketbaseVersions'

export const UpdateCommand = () => {
  const cmd = new Command(`update`)
    .description(`Update PocketBase versions`)
    .action(async (options) => {
      await freshenPocketbaseVersions()
    })
  return cmd
}
