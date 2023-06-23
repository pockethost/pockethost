import { DEBUG, TRACE } from '$constants'
import { logger as loggerService } from '@pockethost/common'

import { Command } from 'commander'
import { createCleanup } from './commands/cleanup'
import { createSeed } from './commands/seed'
const program = new Command()

loggerService({ debug: DEBUG, trace: TRACE, errorTrace: !DEBUG })
const logger = loggerService().create(`stresser`)
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
    'http://127.0.0.1:8090'
  )

createCleanup({ program, logger })

const stressCmd = program.command('stress')
stressCmd
  .description('Stress the system')
  .option(
    '-ic, --instance-count <number>',
    `Number of simultaneous instances to hit`,
    parseInt,
    100
  )
  .option(
    '-rc, --request-count <number>',
    `Number of simultaneous requests per instance`,
    parseInt,
    50
  )
  .action(async () => {
    const options = stressCmd.optsWithGlobals()
    dbg(options)
  })

createSeed({ program, logger })
program.parse()
