import { debounce } from '@s-libs/micro-dash'
import { deploy, excludeDefaults } from '../../vendor/ftp-deploy/module.js'
import type { IFtpDeployArguments } from '../../vendor/ftp-deploy/types.js'
import Bottleneck from 'bottleneck'
import { watch } from 'chokidar'
import { Command } from 'commander'
import multimatch from 'multimatch'
import { ensureDeployKey } from '../lib/deployKey'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient, getInstanceBySubdomainCnameOrId } from '../lib/getClient'
import { savedInstanceName } from './../lib/defaultInstanceId'

export const DEFAULT_INCLUDES = [
  `pb_*`,
  'pb_*/**/*',
  `package.json`,
  `bun.lockb`,
  `bun.lock`,
  `patches`,
  `patches/**/*`,
]

export const DEFAULT_EXCLUDES = [`pb_data`, `pb_data/**/*`]

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
      `No instance name provided and none was found in package.json or pockethost.json. Use 'phio link <instance>'`
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
      const isIncluded = multimatch([file], include).length > 0
      const isExcluded = multimatch([file], exclude).length > 0
      const isIgnored = !isIncluded || isExcluded
      // console.log({
      //   file,
      //   include,
      //   isIncluded,
      //   exclude,
      //   isExcluded,
      //   isIgnored,
      // })
      return isIgnored
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
  await ensureDeployKey(client)
  console.log(`🚚 Deploy started for ${instanceName}`)
  const args: IFtpDeployArguments = {
    server: 'ftp.pockethost.io',
    username: `__auth__`,
    password: client.authStore.exportToCookie(),
    'server-dir': `${instanceName}/`,
    include,
    exclude: [...excludeDefaults, ...exclude],
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
