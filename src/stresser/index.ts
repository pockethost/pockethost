import { LoggerService } from '$shared'

import { LogLevelName } from '$shared'
import { Command } from 'commander'
import { createCleanup } from './commands/cleanup'
import { createSeed } from './commands/seed'
import { createStress } from './commands/stress'
const program = new Command()

LoggerService({ level: LogLevelName.Debug })
const logger = LoggerService().create(`stresser`)
const { dbg, error, info, warn } = logger

// npm install eventsource --save
//@ts-ignore
global.EventSource = require('eventsource')

program
  .name('stresser')
  .description('CLI tool to stress the hell out of PocketBase')
  .version('0.1.0')
  .option(
    '-u, --mothership-url',
    'URL to central database',
    'http://127.0.0.1:8090',
  )

createCleanup({ program, logger })

createStress({ program, logger })

createSeed({ program, logger })
program.parse()
