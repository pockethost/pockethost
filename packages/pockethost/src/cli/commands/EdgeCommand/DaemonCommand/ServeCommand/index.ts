import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { daemon } from './daemon'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run an edge daemon server`).action(async (options: Options) => {
    const logger = LoggerService().create(`cli:edge:daemon:serve`)
    const { info, warn } = logger
    info(`Starting`)

    await daemon({ logger })
    await neverendingPromise(logger)
  })
  return cmd
}
