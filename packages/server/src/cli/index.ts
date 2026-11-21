#!/usr/bin/env -S tsx

import { LogLevelName, gracefulExit, logger } from '@'
import { program } from 'commander'
import { version } from '../../package.json'
import { EdgeCommand } from './commands/EdgeCommand'
import { HealthCommand } from './commands/HealthCommand'
import { MothershipCommand } from './commands/MothershipCommand'
import { PocketBaseCommand } from './commands/PocketBaseCommand'
import { SftpCommand } from './commands/SftpCommand'
import { initIoc } from './ioc'

export type GlobalOptions = {
  logLevel?: LogLevelName
  debug: boolean
}

export const main = async () => {
  await initIoc()
  program.name('pockethost').description('Multitenant PocketBase hosting')

  program
    .addCommand(MothershipCommand())
    .addCommand(EdgeCommand())
    .addCommand(HealthCommand())
    .addCommand(SftpCommand())
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
