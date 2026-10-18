import { Command } from 'commander'
import { generateApiKey } from '../lib/apiKey'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient, getInstanceBySubdomainCnameOrId } from '../lib/getClient'
import { fingerprintForPublicKey } from '../lib/sshPublicKey'

const SSH_KEYS_COLLECTION = 'ssh_keys'

export const createApiKey = async (instanceName: string, label?: string) => {
  if (!instanceName) {
    throw new Error(
      `No instance name provided and none is linked. Use 'phio keys create <instance>'`
    )
  }

  await ensureLoggedIn()
  const client = await getClient()
  const email = client.authStore.record?.email
  const userId = client.authStore.record?.id
  if (!email || !userId) {
    throw new Error(`You must be logged in first. Use 'phio login'`)
  }

  const instance = await (async () => {
    try {
      return await getInstanceBySubdomainCnameOrId(instanceName)
    } catch (error) {
      throw new Error(`Instance ${instanceName} not found`)
    }
  })()

  const { token, publicKey } = generateApiKey(email)
  const keyLabel = label || `phio API key (${instance.subdomain})`
  await client.collection(SSH_KEYS_COLLECTION).create({
    label: keyLabel,
    public_key: publicKey,
    fingerprint: fingerprintForPublicKey(publicKey),
    all_instances: false,
    instances: [instance.id],
    user: userId,
  })

  return { token, label: keyLabel, subdomain: instance.subdomain as string }
}

export const KeysCommand = () => {
  const cmd = new Command(`keys`).description(
    `Manage instance-scoped API keys for CI`
  )

  cmd
    .command(`create`)
    .argument(`[instanceName]`, `Instance name`, savedInstanceName())
    .description(`Create an API key that can only deploy to one instance`)
    .option(`-l, --label <label>`, `Label shown under Account → Keys`)
    .action(async (instanceName, options) => {
      const { token, label, subdomain } = await createApiKey(
        instanceName,
        options.label
      )
      console.log(`Created "${label}" (deploys to ${subdomain} only)`)
      console.log(``)
      console.log(token)
      console.log(``)
      console.log(`This key is shown once. Store it as a secret, then run:`)
      console.log(`  PHIO_API_KEY=<key> phio deploy ${subdomain}`)
      console.log(`Revoke it any time at https://pockethost.io/account/keys`)
    })

  return cmd
}
