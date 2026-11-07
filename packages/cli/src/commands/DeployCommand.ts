import { Command } from 'commander'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { DEFAULT_EXCLUDES, DEFAULT_INCLUDES, deployMyCode } from './DevCommand'

export const DeployCommand = () => {
  return new Command(`deploy`)
    .argument(`[instanceName]`, `Instance name`, savedInstanceName())
    .description(`Deploy to remote`)
    .option(`-v, --verbose`, `Verbose output`)
    .option(
      '-i, --include <include...>',
      'Files to include in the sync',
      (val, prev) => [...prev, ...val.split(',')],
      DEFAULT_INCLUDES
    )
    .option(
      '-e, --exclude <exclude...>',
      'Files to exclude from the sync',
      (val, prev) => {
        return [...prev, ...val.split(',')]
      },
      DEFAULT_EXCLUDES
    )
    .action(async (instanceName, options) => {
      const { include, exclude, verbose } = options
      await deployMyCode(instanceName, include, exclude, verbose)
    })
}
