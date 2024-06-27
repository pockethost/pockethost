import { Command } from 'commander'
import {
  LoggerService,
  doServeAction,
  doServeSlugsFilter,
} from '../../../common'

type Options = {
  only: string[]
}

export const ServeCommand = async () => {
  const serveSlugs = await doServeSlugsFilter([])

  const cmd = new Command(`serve`)
    .description(`Run PocketHost`)
    .option(
      `-o, --only <only>`,
      `Only run the specified services`,
      (s) =>
        s
          .split(/,/)
          .map((s) => s.trim())
          .filter((s) => serveSlugs.includes(s)),
      serveSlugs,
    )
    .action(async (options: Options, cmd: Command) => {
      const logger = LoggerService().create(`ServeCommand`)
      const { dbg, error, info, warn } = logger
      info(`Starting`)

      const { only } = options
      await doServeAction({ only })
    })
  return cmd
}
