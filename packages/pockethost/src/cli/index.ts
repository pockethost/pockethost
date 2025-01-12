#!/usr/bin/env tsx

import { LogLevelName, gracefulExit, logger } from '@'
import { program } from 'commander'
import { EventSource } from 'eventsource'
import { version } from '../../package.json'
import { EdgeCommand } from './commands/EdgeCommand'
import { FirewallCommand } from './commands/FirewallCommand'
import { HealthCommand } from './commands/HealthCommand'
import { MothershipCommand } from './commands/MothershipCommand'
import { PocketBaseCommand } from './commands/PocketBaseCommand'
import { MailCommand } from './commands/SendMailCommand'
import { ServeCommand } from './commands/ServeCommand'
import { initIoc } from './ioc'

export type GlobalOptions = {
  logLevel?: LogLevelName
  debug: boolean
}

//@ts-ignore
global.EventSource = EventSource

export const main = async () => {
  await initIoc()
  program.name('pockethost').description('Multitenant PocketBase hosting')

  program
    .addCommand(MothershipCommand())
    .addCommand(EdgeCommand())
    .addCommand(HealthCommand())
    .addCommand(FirewallCommand())
    .addCommand(MailCommand())
    .addCommand(ServeCommand())
    .addCommand(PocketBaseCommand())
    .action(async () => {
      logger().context({ cli: 'main' })
      const { info, dbg } = logger()
      info('PocketHost CLI')
      info(`Version: ${version}`, { version })
      program.help()
    })

  await program.parseAsync()
  await gracefulExit()
}

main()
