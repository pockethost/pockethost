import { GobotService, LoggerService, MOTHERSHIP_HOOKS_DIR, PH_ALLOWED_POCKETBASE_SEMVER, stringify } from '@'
import { uniq } from '@s-libs/micro-dash'
import { Command } from 'commander'
import { writeFileSync } from 'fs'
import { compare, parse, prerelease, satisfies } from 'semver'

export const UpdateVersionsCommand = () => {
  const cmd = new Command(`update-versions`).description(`Update pocketbase versions`).action(async () => {
    await freshenPocketbaseVersions()
  })
  return cmd
}

export async function freshenPocketbaseVersions() {
  const { info } = LoggerService().create(`freshenPocketbaseVersions`)

  const { gobot } = await GobotService()

  info(`Updating pocketbase`)
  const bot = await gobot(`pocketbase`)
  const versions = uniq(
    (await bot.versions())
      .map((v) => parse(v))
      .filter((v) => !!v)
      .filter((v) => satisfies(v, PH_ALLOWED_POCKETBASE_SEMVER()) && prerelease(v) === null)
      .sort(compare)
      .reverse()
      .map((v) => `${v.major}.${v.minor}.*`)
  )
  const cjs = `module.exports = ${stringify(versions, null, 2)}`

  const path = MOTHERSHIP_HOOKS_DIR(`versions.cjs`)
  info(`Writing to ${path}`, { versions })
  writeFileSync(path, cjs)

  return cjs
}
