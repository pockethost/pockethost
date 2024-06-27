import { Command } from 'commander'
import {
  LoggerService,
  doServeAction,
  doServeSlugsFilter,
  loadPlugins,
} from '../../../common'

type GlobalOptions = {
  extraPlugins: string[]
}

type Options = {
  only: string[]
} & GlobalOptions

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
    .action(async (unused: Options, cmd: Command) => {
      const logger = LoggerService().create(`ServeCommand`)
      const { dbg, error, info, warn } = logger
      info(`Starting`)

      const { only, extraPlugins } = cmd.optsWithGlobals<Options>()
      await loadPlugins(extraPlugins)
      dbg(`CLI:`, cmd.optsWithGlobals())
      await doServeAction({ only })
    })
  return cmd
}
