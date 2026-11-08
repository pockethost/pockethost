import { Command } from 'commander'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { deployDryRun, deployToDir } from '../lib/deployLocal'
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
      `--node-modules`,
      `Ship the production node_modules tree and remove packages no longer used (default with a package.json)`
    )
    .option(
      `--no-node-modules`,
      `Don't ship node_modules; leave the instance's node_modules alone`
    )
    .option(
      `--out <dir>`,
      `Write the deploy set to a local folder instead of deploying`
    )
    .option(`--dry-run`, `List what would be deployed, deploy nothing`)
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
      const {
        include,
        exclude,
        verbose,
        sftp,
        commit,
        message,
        out,
        dryRun,
        nodeModules,
      } = options
      if (out || dryRun) {
        const local = {
          include,
          exclude,
          verbose,
          nodeModules,
        }
        if (dryRun) await deployDryRun(local)
        else await deployToDir(out, local)
        return
      }
      await deployMyCode(instanceName, include, exclude, verbose, {
        sftp,
        commit,
        message,
        nodeModules,
      })
    })
}
