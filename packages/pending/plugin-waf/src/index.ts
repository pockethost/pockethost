import {
  Command,
  LoggerService,
  PocketHostFilter,
  PocketHostPlugin,
} from 'pockethost/core'
import { FirewallCommand } from './FirewallCommand'

const logger = LoggerService().create('plugin-waf')
export const { dbg, info } = logger

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  registerFilter(
    PocketHostFilter.Core_CliCommands,
    async (commands: Command[]) => {
      return [...commands, FirewallCommand()]
    },
  )
}

export default plugin
