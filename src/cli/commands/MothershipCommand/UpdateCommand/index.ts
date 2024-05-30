import { Command } from 'commander'
import { freshenPocketbaseVersions } from '../freshenPocketbaseVersions'

type Options = {}

export const UpdateCommand = () => {
  const cmd = new Command(`update`)
    .description(`Update known PocketBase versions`)
    .action(async (options: Options) => {
      const cjs = await freshenPocketbaseVersions()
      console.log(cjs)
    })
  return cmd
}
