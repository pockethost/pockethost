#!/usr/bin/env tsx

import { uniq } from '@s-libs/micro-dash'
import { program } from 'commander'
import { readFileSync } from 'fs'
import updateNotifier from 'update-notifier'
import {
  DEBUG,
  LogLevelName,
  LoggerService,
  PH_PLUGINS,
  PH_PROJECT_DIR,
  doCliCommandsFilter,
  loadPlugins,
} from '../../core'
import { ConfigCommand } from './commands/ConfigCommand'
import { PluginCommand } from './commands/PluginCommand'
import { ServeCommand } from './commands/ServeCommand'

export const { dbg, info, error } = LoggerService({
  level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
})

export const main = async () => {
  await loadPlugins(uniq(PH_PLUGINS()))
  const pkg = await JSON.parse(
    readFileSync(PH_PROJECT_DIR(`package.json`), 'utf8').toString(),
  )
  updateNotifier({ pkg }).notify()

  const { version } = pkg

  program
    .name('pockethost')
    .description('Multitenant PocketBase hosting')
    .version(version)

  const commands = await doCliCommandsFilter([
    ServeCommand(),
    ConfigCommand(),
    PluginCommand(),
  ])

  for (const command of commands) {
    program.addCommand(command)
  }

  await program.parseAsync()
}

main()
