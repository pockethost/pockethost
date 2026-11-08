import { Command } from 'commander'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { DEFAULT_EXCLUDES, DEFAULT_INCLUDES, deployMyCode } from './DevCommand'

export const DeployCommand = () => {
  return new Command(`deploy`)
    .argument(`[instanceName]`, `Instance name`, savedInstanceName())
    .description(
      `Deploy pb_hooks, pb_migrations, pb_public and packages to an instance`
    )
    .option(`-v, --verbose`, `Verbose output`)
    .option(`--sftp`, `Sync over SFTP instead of the deploy API`)
    .option(
      `--commit <sha>`,
      `Commit SHA to record (default: $GITHUB_SHA or git HEAD)`
    )
    .option(`-m, --message <message>`, `Note to record with this deploy`)
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
      const { include, exclude, verbose, sftp, commit, message } = options
      await deployMyCode(instanceName, include, exclude, verbose, {
        sftp,
        commit,
        message,
      })
    })
}
