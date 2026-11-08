import { program } from 'commander'
import { version } from '../package.json'
import { ensureProjectRoot } from './lib/projectRoot'
import { DeployCommand } from './commands/DeployCommand'
import { DevCommand } from './commands/DevCommand'
import { InfoCommand } from './commands/InfoCommand'
import { LinkCommand } from './commands/LinkCommand'
import { ListCommand } from './commands/ListCommand'
import { LoginCommand } from './commands/LoginCommand'
import { LogoutCommand } from './commands/LogoutCommand'
import { LogsCommand } from './commands/LogsCommand'
import { SftpCommand } from './commands/SftpCommand'
import { TokenCommand } from './commands/TokenCommand'

ensureProjectRoot()

program
  .name(`pockethost`)
  .version(version)
  .description(`Deploy, sync, and tail logs for your PocketHost instances`)
  .addCommand(LoginCommand())
  .addCommand(TokenCommand())
  .addCommand(LogsCommand())
  .addCommand(DevCommand())
  .addCommand(ListCommand())
  .addCommand(LinkCommand())
  .addCommand(DeployCommand())
  .addCommand(SftpCommand())
  .addCommand(LogoutCommand())
  .addCommand(InfoCommand())

// Add error handling
program.exitOverride()

program
  .parseAsync(process.argv)
  .catch((err: NodeJS.ErrnoException & { code?: string }) => {
    if (
      err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.help' ||
      err.code === 'commander.version'
    ) {
      process.exit(0)
    }
    if (err.code === 'commander.unknownCommand') {
      console.error('Error: Unknown command')
    } else if (err.code === 'commander.missingArgument') {
      console.error('Error: Missing required argument')
    } else {
      console.error('Error:', err.message)
    }
    process.exit(1)
  })
