import { uniq } from '@s-libs/micro-dash'
import { Command } from 'commander'
import { parse } from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { error, info } from '../..'
import { PH_HOME, PH_PLUGINS, PH_PROJECT_DIR } from '../../../constants'
import { getCompatibleVersions, getPackageJson, removePackage } from './util'

const envFile = () => {
  const envFile = PH_HOME(`.env`)
  if (!existsSync(envFile)) {
    writeFileSync(envFile, '')
  }
  return envFile
}

const _parse = () =>
  parse(readFileSync(envFile(), { encoding: 'utf8' }).toString())

export const PluginCommand = () => {
  const cmd = new Command(`plugin`)
    .description(`Manage PocketHost plugins`)
    .addCommand(
      new Command(`install`)
        .alias(`i`)
        .argument(`<name>`, `NPM registry plugin name`)
        .description(`Install a plugin`)
        .action(async (name: string) => {
          try {
            const pkg = JSON.parse(
              readFileSync(PH_PROJECT_DIR(`package.json`), 'utf8').toString(),
            )
            const { version } = pkg
            await getCompatibleVersions(`pockethost`, version, [name])

            const values = _parse()
            values[`PH_PLUGINS`] = uniq([
              ...(values[`PH_PLUGINS`]
                ?.split(/,/)
                .map((v) => v.trim())
                .filter((v) => !!v) || []),
              name,
            ]).join(`,`)
            writeFileSync(
              envFile(),
              Object.entries(values)
                .map(([k, v]) => `${k}=${v}`)
                .join('\n'),
            )
            info(`Installed ${name}`)
            info(`Written to ${envFile()}`)
          } catch (e) {
            error(`${e}`)
          }
        }),
    )

    .addCommand(
      new Command(`list`)
        .alias(`ls`)
        .description(`List plugins`)
        .action(async (name: string) => {
          try {
            for (const plugin of PH_PLUGINS()) {
              const pkg = await getPackageJson(plugin)
              info(`${plugin}@${pkg.version} - ${pkg?.description}`)
            }
          } catch (e) {
            error(`${e}`)
          }
        }),
    )

    .addCommand(
      new Command(`remove`)
        .alias(`rm`)
        .alias(`uninstall`)
        .alias(`delete`)
        .argument(`<name>`, `Plugin name`)
        .description(`Remove a plugin`)
        .action(async (name) => {
          try {
            await removePackage(name)
            const values = _parse()
            values[`PH_PLUGINS`] = uniq([
              ...(values[`PH_PLUGINS`]
                ?.split(/,/)
                .map((v) => v.trim())
                .filter((v) => v !== name) || []),
            ]).join(`,`)
            writeFileSync(
              envFile(),
              Object.entries(values)
                .map(([k, v]) => `${k}=${v}`)
                .join('\n'),
            )
            info(`Removed ${name}`)
            info(`Written to ${envFile()}`)
          } catch (e) {
            error(`${e}`)
          }
        }),
    )

    .addCommand(
      new Command(`update`)
        .alias(`up`)
        .description(`Update all plugins`)
        .action(async () => {
          try {
            const pkg = JSON.parse(
              readFileSync(PH_PROJECT_DIR(`package.json`), 'utf8').toString(),
            )
            const { version } = pkg
            await getCompatibleVersions(`pockethost`, version, PH_PLUGINS())
          } catch (e) {
            error(`${e}`)
          }
        }),
    )
  return cmd
}
