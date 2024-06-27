import { forEach, keys, omit } from '@s-libs/micro-dash'
import { Command } from 'commander'
import { parse } from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { info } from '../..'
import { PH_HOME, isSettingKey, settings } from '../../../constants'

const envFile = () => {
  const envFile = PH_HOME(`.env`)
  if (!existsSync(envFile)) {
    writeFileSync(envFile, '')
  }
  return envFile
}

const _parse = () =>
  parse(readFileSync(envFile(), { encoding: 'utf8' }).toString())

export const ConfigCommand = () => {
  const cmd = new Command(`config`)
    .description(`Set global config defaults`)
    .addCommand(
      new Command(`set`)
        .argument(`<name>`, `Config name`)
        .argument(`<value>`, `Config value`)
        .description(`Set a config value`)
        .action((name, value) => {
          if (!isSettingKey(name))
            throw new Error(`Invalid setting name ${name}`)

          if (value === '=') throw new Error(`Invalid value ${value}`)

          const values = _parse()
          values[name] = value
          writeFileSync(
            envFile(),
            Object.entries(values)
              .map(([k, v]) => `${k}=${v}`)
              .join('\n'),
          )
          info(`Set ${name}=${value}`)
          info(`Written to ${envFile()}`)
        }),
    )

    .addCommand(
      new Command(`unset`)
        .argument(`<name>`, `Config name`)
        .description(`Unset a config value`)
        .action((name) => {
          if (!isSettingKey(name))
            throw new Error(`Invalid setting name ${name}`)

          const values = _parse()
          delete values[name]
          writeFileSync(
            envFile(),
            Object.entries(values)
              .map(([k, v]) => `${k}=${v}`)
              .join('\n'),
          )
          info(`Unset ${name}`)
          info(`Written to ${envFile()}`)
        }),
    )
    .addCommand(
      new Command(`list`)
        .description(`List all config values`)
        .alias(`ls`)
        .action(() => {
          const values = _parse()

          if (keys(values).length > 0) {
            info()
            info(`Config values from ${envFile()}:`)
            forEach(values, (v, k) => {
              info(`\t${k}=${v}`)
            })
            info()
          } else {
            info(`No config values found in ${envFile()}`)
          }

          const defaults = omit(settings, keys(values) as any)
          if (keys(defaults).length > 0) {
            info(`Default values:`)
            forEach(settings, (v, k) => {
              if (k in values) return
              info(`\t${k}=${v}`)
            })
          } else {
            info(
              `No default values because all values are defined in ${envFile()}`,
            )
          }
        }),
    )
  return cmd
}
