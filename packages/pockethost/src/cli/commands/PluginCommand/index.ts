import { Command } from 'commander'
import { readFileSync } from 'fs'
import { error, info } from '../..'
import { PH_PLUGINS, PH_PROJECT_DIR } from '../../../constants'
import { appendConfig, filterConfig } from '../../../core'
import { getCompatibleVersions, getPackageJson, removePackage } from './util'

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

            appendConfig(`PH_PLUGINS`, name)
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
            filterConfig(`PH_PLUGINS`, name)
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
