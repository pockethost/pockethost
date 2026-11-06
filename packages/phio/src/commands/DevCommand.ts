import { debounce } from '../lib/debounce'
import { deploy, excludeDefaults } from '../../vendor/ftp-deploy/module.js'
import type { IFtpDeployArguments } from '../../vendor/ftp-deploy/types.js'
import Bottleneck from 'bottleneck'
import { watch } from 'chokidar'
import { Command } from 'commander'
import multimatch from 'multimatch'
import { parseApiKey } from '../lib/apiKey'
import { ensureDeployKey } from '../lib/deployKey'
import { PHIO_API_KEY, PHIO_CONFIG_FILE } from '../lib/constants'
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

  const { include, exclude, verbose } = options
  // console.log({ include, exclude })

  // API keys cannot query the mothership; the SFTP server enforces their scope
  const instance = PHIO_API_KEY()
    ? { subdomain: instanceName }
    : await (async () => {
        await ensureLoggedIn()
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

/**
 * PHIO_API_KEY (instance-scoped, for CI) wins over the logged-in user's
 * all-instances deploy key.
 */
const resolveDeployCredentials = async (): Promise<
  Pick<IFtpDeployArguments, 'username' | 'private-key' | 'private-key-path'>
> => {
  const apiKey = PHIO_API_KEY()
  if (apiKey) {
    const { email, privateKey } = parseApiKey(apiKey)
    return { username: email, 'private-key': privateKey }
  }

  await ensureLoggedIn()
  const client = await getClient()
  const { privateKeyPath } = await ensureDeployKey(client)
  const email = client.authStore.record?.email
  if (!email) {
    throw new Error(`You must be logged in first. Use 'phio login'`)
  }
  return { username: email, 'private-key-path': privateKeyPath }
}

export async function deployMyCode(
  instanceName: string,
  include: string[],
  exclude: string[],
  verbose: boolean
) {
  const credentials = await resolveDeployCredentials()

  console.log(`🚚 Deploy started for ${instanceName}`)
  const args: IFtpDeployArguments = {
    server: PHIO_SFTP_HOST,
    protocol: 'sftp',
    port: PHIO_SFTP_PORT,
    ...credentials,
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
