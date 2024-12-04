import { GobotService, LoggerService } from '@'

export async function freshenPocketbaseVersions() {
  const { info } = LoggerService().create(`freshenPocketbaseVersions`)

  const { gobot } = await GobotService()

  info(`Updating pocketbase`)
  const bot = await gobot(`pocketbase`)
  await bot.update()
  await bot.download()
}
