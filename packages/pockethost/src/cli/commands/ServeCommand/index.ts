import { Command } from 'commander'
import { LoggerService } from '../../../common'
import { serve } from '../../../server'

type Options = {
  isolate: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run PocketHost`)
    .action(async (options: Options) => {
      const logger = LoggerService().create(`ServeCommand`)
      const { dbg, error, info, warn } = logger
      info(`Starting`)

      await serve()
    })
  return cmd
}
