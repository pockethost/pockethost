import { Command } from 'commander'
import { listConfig, setConfig, unsetConfig } from '../../../core'

export const ConfigCommand = () => {
  const cmd = new Command(`config`)
    .description(`Set global config defaults`)
    .addCommand(
      new Command(`set`)
        .argument(`<name>`, `Config name`)
        .argument(`<value>`, `Config value`)
        .description(`Set a config value`)
        .action(setConfig),
    )

    .addCommand(
      new Command(`unset`)
        .argument(`<name>`, `Config name`)
        .description(`Unset a config value`)
        .action(unsetConfig),
    )
    .addCommand(
      new Command(`list`)
        .description(`List all config values`)
        .alias(`ls`)
        .action(listConfig),
    )
  return cmd
}
