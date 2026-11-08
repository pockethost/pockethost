import { debounce } from '../lib/debounce'
import { deploy, excludeDefaults } from '../../vendor/ftp-deploy/module.js'
import type { IFtpDeployArguments } from '../../vendor/ftp-deploy/types.js'
import Bottleneck from 'bottleneck'
import { watch } from 'chokidar'
import { Command } from 'commander'
import multimatch from 'multimatch'
import { PROJECT_CONFIG_FILE } from '../lib/constants'
import { SFTP_HOST, SFTP_PORT } from '../lib/sftpConnection'
import { sftpCredentials } from '../lib/sftpAuth'
import { findInstance } from '../lib/token'
import { savedInstanceName } from './../lib/defaultInstanceId'
import { createDeployClient, deployViaApi } from '../lib/deployApi'
import { resolveDeployCredential } from '../lib/token'
import {
  DEFAULT_EXCLUDES,
  DEFAULT_INCLUDES,
  mergeDeployExcludes,
  shouldSyncFile,
} from '../lib/deployIncludes'

export { DEFAULT_EXCLUDES, DEFAULT_INCLUDES }

export type DeployOptions = {
  include: string[]
  exclude: string[]
  verbose: boolean
  /** Use the legacy SFTP sync instead of the deploy API */
  sftp?: boolean
  commit?: string
  message?: string
}

export const watchAndDeploy = async (
  instanceName: string,
  options: DeployOptions = {
    include: DEFAULT_INCLUDES,
    exclude: DEFAULT_EXCLUDES,
    verbose: false,
  }
) => {
  if (!instanceName) {
    throw new Error(
      `No instance name provided and none was found in ${PROJECT_CONFIG_FILE}. Use 'pockethost link <instance>'`
    )
  }
  console.log(`Dev mode`)

  const { include, exclude, verbose, sftp } = options

  const subdomain = await (async () => {
    if (sftp) {
      await sftpCredentials()
      return (await findInstance(instanceName)).subdomain
    }
    // Fail fast on a bad token or instance name before watching.
    const { instance } = await createDeployClient(
      instanceName,
      await resolveDeployCredential()
    ).whoami()
    return instanceName.includes('.') ? instanceName : instance.subdomain
  })()

  const limiter = new Bottleneck({ maxConcurrent: 1 })
  const upload = debounce(
    () =>
      limiter.schedule(() =>
        deployMyCode(subdomain, include, exclude, verbose, { sftp }).catch(
          (e) => console.error(`Deploy failed: ${e.message ?? e}`)
        )
      ),
    200
  )

  const watcher = watch('.', {
    persistent: true,
    ignored: (file) => {
      if (file === '.') return false
      return !shouldSyncFile(file, include, exclude, multimatch)
    },
  })
  console.log(
    `Watching for changes in ${include.join(', ')} and excluding ${exclude.join(
      ', '
    )}`
  )
  const handle = (path: string, details: any) => {
    upload()
    // internal
    // console.log(`Syncing ${path}`)
  }
  watcher.on('add', handle).on('change', handle).on('unlink', handle)
}

export async function deployMyCode(
  instanceName: string,
  include: string[],
  exclude: string[],
  verbose: boolean,
  extra: { sftp?: boolean; commit?: string; message?: string } = {}
) {
  if (!instanceName) {
    throw new Error(
      `No instance name provided and none was found in ${PROJECT_CONFIG_FILE}. Use 'pockethost link <instance>'`
    )
  }
  if (!extra.sftp) {
    await deployViaApi({
      instanceName,
      include,
      exclude,
      verbose,
      commit: extra.commit,
      message: extra.message,
    })
    return
  }
  return deployMyCodeOverSftp(instanceName, include, exclude, verbose)
}

/** SFTP sync (`--sftp`). Uses the CLI's SSH key, which must already be on your account (Account → Keys). */
async function deployMyCodeOverSftp(
  instanceName: string,
  include: string[],
  exclude: string[],
  verbose: boolean
) {
  const { email, privateKeyPath } = await sftpCredentials()

  console.log(`🚚 Deploy started for ${instanceName}`)
  const args: IFtpDeployArguments = {
    server: SFTP_HOST,
    protocol: 'sftp',
    port: SFTP_PORT,
    username: email,
    'private-key-path': privateKeyPath,
    'server-dir': `${instanceName}/`,
    include,
    exclude: mergeDeployExcludes(excludeDefaults, exclude),
    'log-level': verbose ? 'verbose' : 'minimal',
  }

  await deploy(args)
  console.log('🚀 Deploy done!')
}

export const DevCommand = () => {
  return new Command('dev')
    .argument(`[instanceName]`, `Instance name`, savedInstanceName())
    .description(`Watch for local modifications and deploy them`)
    .option(`-v, --verbose`, `Verbose output`)
    .option(`--sftp`, `Sync over SFTP instead of the deploy API`)
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
    .action(watchAndDeploy)
}
