import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { sftp } from './sftp'

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run the PocketHost SFTP server`).action(async () => {
    const logger = LoggerService().create(`cli:sftp:serve`)
    const { info } = logger
    info(`Starting`)
    await sftp()
    await neverendingPromise(logger)
  })
  return cmd
}
