import { debounce } from '../lib/debounce'
import { deploy, excludeDefaults } from '../../vendor/ftp-deploy/module.js'
import type { IFtpDeployArguments } from '../../vendor/ftp-deploy/types.js'
import Bottleneck from 'bottleneck'
import { watch } from 'chokidar'
import { Command } from 'commander'
import multimatch from 'multimatch'
import { ensureDeployKey } from '../lib/deployKey'
import { PHIO_CONFIG_FILE } from '../lib/constants'
import { PHIO_SFTP_HOST, PHIO_SFTP_PORT } from '../lib/sftpConnection'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient, getInstanceBySubdomainCnameOrId } from '../lib/getClient'
import { savedInstanceName } from './../lib/defaultInstanceId'
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
      `No instance name provided and none was found in ${PHIO_CONFIG_FILE}. Use 'phio link <instance>'`
    )
  }
  console.log(`Dev mode`)
  await ensureLoggedIn()

  const { include, exclude, verbose } = options
  // console.log({ include, exclude })

  const instance = await (async () => {
    try {
      return await getInstanceBySubdomainCnameOrId(instanceName)
    } catch (error) {
      throw new Error(`Instance ${instanceName} not found`)
    }
  })()

  const limiter = new Bottleneck({ maxConcurrent: 1 })
  const upload = debounce(
    () =>
      limiter.schedule(() =>
        deployMyCode(instance.subdomain, include, exclude, verbose).catch(
          console.error
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
  verbose: boolean
) {
  await ensureLoggedIn()
  const client = await getClient()
  const { privateKeyPath } = await ensureDeployKey(client)
  const email = client.authStore.record?.email
  if (!email) {
    throw new Error(`You must be logged in first. Use 'phio login'`)
  }

  console.log(`🚚 Deploy started for ${instanceName}`)
  const args: IFtpDeployArguments = {
    server: PHIO_SFTP_HOST,
    protocol: 'sftp',
    port: PHIO_SFTP_PORT,
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
    .description(`Watch for local modifications and sync to remote`)
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
    .action(watchAndDeploy)
}
