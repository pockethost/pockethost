import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { ftp } from './ftp'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run an edge FTP server`).action(async (options: Options) => {
    const logger = LoggerService().create(`cli:edge:ftp:serve`)
    const { info } = logger
    info(`Starting`)
    await ftp()
    await neverendingPromise(logger)
  })
  return cmd
}
