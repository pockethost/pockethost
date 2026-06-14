import { Command } from 'commander'
import { DEPLOY_KEY_LABEL, ensureDeployKey, formatDeployKeyRemoteStatus, getDeployKeyStatus } from '../lib/deployKey'
import { PHIO_HOME } from '../lib/constants'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { resolveAuthStatus } from '../lib/getClient'

export const showInfo = async () => {
  const auth = await resolveAuthStatus()

  if (auth.state !== 'authenticated') {
    console.log(`Not logged in. Run 'phio login'.`)
    return
  }

  await ensureDeployKey(auth.client)
  const status = await getDeployKeyStatus(auth.client)

  console.log(`Config root: ${PHIO_HOME()}`)
  console.log(`Logged in as: ${auth.email}`)
  console.log(`Instance: ${savedInstanceName() || '(not linked)'}`)
  console.log(`Deploy key label: ${DEPLOY_KEY_LABEL}`)
  console.log(`Deploy key private: ${status.privateKeyPath}`)
  console.log(`Deploy key public: ${status.publicKeyPath}`)
  console.log(`Deploy key fingerprint: ${status.fingerprint}`)
  console.log(`Deploy key remote: ${formatDeployKeyRemoteStatus(status.remote)}`)
}

export const InfoCommand = () => {
  return new Command(`info`)
    .alias(`whoami`)
    .description(`Show login and config info`)
    .action(showInfo)
}
