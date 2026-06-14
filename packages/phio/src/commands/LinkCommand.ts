import { select } from '@inquirer/prompts'
import { Command } from 'commander'
import { saveInstanceName } from '../lib/defaultInstanceId'
import { InstanceFields } from '../lib/InstanceFields'
import { getClient, getInstanceBySubdomainCnameOrId } from './../lib/getClient'

export const link = async (instanceName: string) => {
  saveInstanceName(instanceName, 'package.json')
  const instance = await getInstanceBySubdomainCnameOrId(instanceName)
  if (!instance) {
    return
  }
  return instance
}

export const linkWithUserInput = async () => {
  const client = await getClient()
  const instances = await client
    .collection(`instances`)
    .getFullList<InstanceFields>()

  if (instances.length === 0) {
    console.error(
      `No instances found. If this seems wrong, use 'phio login' to log in, then try again.`
    )
    return
  }

  while (true) {
    const instanceName = await select({
      message: `Choose the instance you'd like to link`,
      choices: instances
        .sort((a, b) => a.subdomain.localeCompare(b.subdomain))
        .map((instance) => ({
          name: `${instance.subdomain} (${instance.id}) ${
            instance.cname ? `(${instance.cname})` : ''
          } (${instance.status.toUpperCase()})`,
          value: instance.subdomain,
        })),
    })
    const instance = await link(instanceName)
    if (!instance) {
      console.error(`Instance not found`)
      continue
    }
    console.log(`Linked ${instance.subdomain}`)
    break
  }
}

export const LinkCommand = () => {
  return new Command(`link`)
    .argument(`[instance]`, `Instance name or ID`)
    .description(`Link a local directory to a remote instance`)
    .action(async (_anyName) => {
      if (_anyName) {
        const instance = await link(_anyName)
        if (!instance) {
          console.error(`Instance ${_anyName} not found`)
          process.exit(1)
        }
        console.log(`Linked ${instance.subdomain}`)
        return
      }
      await linkWithUserInput()
    })
}
