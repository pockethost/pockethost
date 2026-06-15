import { spawn, spawnSync } from 'child_process'
import { Command } from 'commander'
import { ensureDeployKey } from '../lib/deployKey'
import { PHIO_CONFIG_FILE } from '../lib/constants'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient, getInstanceBySubdomainCnameOrId } from '../lib/getClient'
import {
  formatSftpCommand,
  PHIO_SFTP_HOST,
  PHIO_SFTP_PORT,
  type SftpConnection,
  buildSftpArgs,
} from '../lib/sftpConnection'

const findSftpExecutable = (): string | null => {
  const lookup = process.platform === 'win32' ? 'where' : 'which'
  const result = spawnSync(lookup, ['sftp'], { encoding: 'utf8' })
  if (result.status !== 0) {
    return null
  }
  const line = result.stdout.trim().split(/\r?\n/)[0]?.trim()
  return line || null
}

const resolveRemoteDir = async (instanceName?: string) => {
  const name = instanceName || savedInstanceName()
  if (!name) {
    return ''
  }

  try {
    const instance = await getInstanceBySubdomainCnameOrId(name)
    return `${instance.subdomain}/`
  } catch {
    throw new Error(`Instance ${name} not found`)
  }
}

export const openSftpSession = async (
  instanceName?: string,
  printOnly = false
) => {
  if (!instanceName && !savedInstanceName()) {
    console.log(
      `No linked instance in ${PHIO_CONFIG_FILE}. Opening SFTP at instance root.`
    )
  }

  await ensureLoggedIn()
  const client = await getClient()
  const { privateKeyPath } = await ensureDeployKey(client)
  const email = client.authStore.record?.email
  if (!email) {
    throw new Error(`You must be logged in first. Use 'phio login'`)
  }

  const connection: SftpConnection = {
    host: PHIO_SFTP_HOST,
    port: PHIO_SFTP_PORT,
    username: email,
    privateKeyPath,
    remoteDir: await resolveRemoteDir(instanceName),
  }

  const commandLine = formatSftpCommand(connection)

  if (printOnly) {
    console.log(commandLine)
    return
  }

  const sftpBin = findSftpExecutable()
  if (!sftpBin) {
    console.error(
      `Could not find 'sftp' on PATH. Install OpenSSH client tools, then run:`
    )
    console.error('')
    console.error(commandLine)
    console.error('')
    console.error('See https://pockethost.io/docs/ftp for client setup.')
    process.exit(1)
  }

  const child = spawn(sftpBin, buildSftpArgs(connection), { stdio: 'inherit' })
  await new Promise<void>((_resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal)
        return
      }
      process.exit(code ?? 0)
    })
  })
}

export const SftpCommand = () => {
  return new Command('sftp')
    .argument(`[instanceName]`, `Instance name`, savedInstanceName())
    .description(`Open an interactive SFTP session to your instance files`)
    .option(`--print`, `Print the sftp command instead of running it`)
    .action(async (instanceName, options) => {
      await openSftpSession(instanceName || undefined, options.print)
    })
}
