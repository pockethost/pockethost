import { Command, PocketHostFilter, PocketHostPlugin } from 'pockethost/core'
import { SyslogCommand } from './SyslogCommand'

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  registerFilter(
    PocketHostFilter.Core_CliCommands,
    async (commands: Command[]) => {
      return [...commands, SyslogCommand()]
    },
  )
}

export default plugin
