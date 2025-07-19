import { logger } from '@'
import { Command } from 'commander'
import { daemon } from './daemon'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run an edge daemon server`).action(async (options: Options) => {
    logger().context({ cli: 'edge:daemon:serve' })
    await daemon()
  })
  return cmd
}
