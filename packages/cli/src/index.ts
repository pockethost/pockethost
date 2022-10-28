import { program } from 'commander'

declare global {
  let __go_app: any
}

import 'cross-fetch/polyfill'
import 'eventsource'
import packagex from '../package.json'
import { addPublishCommand } from './commands/publish'
console.log(`PBScript ${packagex.version}`)

program
  .name('pbscript')
  .description('CLI for JavaScript extensions for PocketBase ')
  .version('0.0.1')
addPublishCommand(program)
// addDevCommand(program)

program.parse()
