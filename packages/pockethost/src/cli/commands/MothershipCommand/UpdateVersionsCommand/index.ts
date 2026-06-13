import { freshenPocketbaseVersions } from '@'
import { Command } from 'commander'

export const UpdateVersionsCommand = () => {
  const cmd = new Command(`update-versions`)
    .description(`Update pocketbase versions (alias for pocketbase update)`)
    .action(async () => {
      await freshenPocketbaseVersions()
    })
  return cmd
}
