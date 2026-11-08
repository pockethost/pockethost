import { existsSync, readFileSync } from 'fs'
import { Command } from 'commander'
import {
  DEPLOY_KEY_LABEL,
  getDeployKeyPaths,
  SSH_KEYS_URL,
} from '../lib/deployKey'
import { CLI_HOME } from '../lib/constants'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { fingerprintForPublicKey } from '../lib/sshPublicKey'
import { resolveDeployCredential, tokenWhoami } from '../lib/token'
import { showTokenStatus } from './TokenCommand'

/** SSH key line for `pockethost info`. Reads the local key only; never creates one. */
const sshKeyStatus = async () => {
  const { publicKeyPath } = getDeployKeyPaths()
  if (!existsSync(publicKeyPath))
    return `none yet (created the first time you use SFTP)`
  const fingerprint = fingerprintForPublicKey(
    readFileSync(publicKeyPath, 'utf8').trim()
  )
  try {
    const who = await tokenWhoami(
      (await resolveDeployCredential()).token,
      fingerprint
    )
    return who.sshKey
      ? `${fingerprint}, on your account as "${who.sshKey.label}"`
      : `${fingerprint}, not on your account (add ${publicKeyPath} at ${SSH_KEYS_URL})`
  } catch {
    return fingerprint
  }
}

export const showInfo = async () => {
  console.log(`Config root: ${CLI_HOME()}`)
  console.log(`Instance: ${savedInstanceName() || '(not linked)'}`)
  await showTokenStatus()
  console.log(`SFTP key (${DEPLOY_KEY_LABEL}): ${await sshKeyStatus()}`)
}

export const InfoCommand = () => {
  return new Command(`info`)
    .alias(`whoami`)
    .description(`Show the token, linked instance and SFTP key in use`)
    .action(showInfo)
}
