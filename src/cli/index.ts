#!/usr/bin/env node

import { DEBUG, DefaultSettingsService, SETTINGS } from '$constants'
import { LogLevelName, LoggerService } from '$shared'
import { program } from 'commander'
import EventSource from 'eventsource'
import { EdgeCommand } from './commands/EdgeCommand'
import { FirewallCommand } from './commands/FirewallCommand'
import { HealthCommand } from './commands/HealthCommand'
import { MothershipCommand } from './commands/MothershipCommand'
import { SendMailCommand } from './commands/SendMailCommand'
import { ServeCommand } from './commands/ServeCommand'
export type GlobalOptions = {
  logLevel?: LogLevelName
  debug: boolean
}

DefaultSettingsService(SETTINGS)

LoggerService({ level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info })

//@ts-ignore
global.EventSource = EventSource

export const main = async () => {
  program.name('pockethost').description('Multitenant PocketBase hosting')

  program
    .addCommand(MothershipCommand())
    .addCommand(EdgeCommand())
    .addCommand(HealthCommand())
    .addCommand(FirewallCommand())
    .addCommand(SendMailCommand())
    .addCommand(ServeCommand())

  await program.parseAsync()
}

main()
