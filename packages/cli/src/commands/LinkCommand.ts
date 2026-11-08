import { select } from '@inquirer/prompts'
import { Command } from 'commander'
import { saveInstanceName } from '../lib/defaultInstanceId'
import { findInstance, formatInstance, listInstances } from '../lib/token'

export const link = async (instanceName: string) => {
  const instance = await findInstance(instanceName)
  saveInstanceName(instance.subdomain)
  return instance
}

export const linkWithUserInput = async () => {
  const instances = await listInstances()
  if (instances.length === 0) {
    console.error(`No instances found for this token.`)
    return
  }
  const instanceName = await select({
    message: `Choose the instance you'd like to link`,
    choices: instances.map((instance) => ({
      name: formatInstance(instance),
      value: instance.subdomain,
    })),
  })
  const instance = await link(instanceName)
  console.log(`Linked ${instance.subdomain}`)
}

export const LinkCommand = () => {
  return new Command(`link`)
    .argument(`[instance]`, `Instance name or ID`)
    .description(`Link a local directory to a remote instance`)
    .action(async (anyName?: string) => {
      if (anyName) {
        const instance = await link(anyName)
        console.log(`Linked ${instance.subdomain}`)
        return
      }
      await linkWithUserInput()
    })
}
