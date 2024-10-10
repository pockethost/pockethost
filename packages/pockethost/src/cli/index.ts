#!/usr/bin/env tsx

import { program } from 'commander'
import EventSource from 'eventsource'
import { LogLevelName, LoggerService } from '../../core'
import { version } from '../../package.json'
import { EdgeCommand } from './commands/EdgeCommand'
import { FirewallCommand } from './commands/FirewallCommand'
import { HealthCommand } from './commands/HealthCommand'
import { MothershipCommand } from './commands/MothershipCommand'
import { PocketBaseCommand } from './commands/PocketBaseCommand'
import { SendMailCommand } from './commands/SendMailCommand'
import { ServeCommand } from './commands/ServeCommand'
import './ioc'

export type GlobalOptions = {
  logLevel?: LogLevelName
  debug: boolean
}

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
    .addCommand(PocketBaseCommand())
    .action(async () => {
      const { info, dbg } = LoggerService()
      info('PocketHost CLI')
      info(`Version: ${version}`, { version })
      program.help()
    })

  await program.parseAsync()
}

main()
