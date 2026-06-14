import { Command } from 'commander'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient } from './../lib/getClient'
import { InstanceFields } from './../lib/InstanceFields'

export const ListCommand = () => {
  return new Command(`list`)
    .alias(`ls`)
    .description(`List all the logs`)
    .action(async () => {
      await ensureLoggedIn()
      const client = await getClient()
      const instances = await client
        .collection(`instances`)
        .getFullList<InstanceFields>()
      instances
        .sort((a, b) => a.subdomain.localeCompare(b.subdomain))
        .forEach((instance) => {
          console.log(
            `- ${instance.subdomain} (${instance.id}) ${
              instance.cname ? `(${instance.cname})` : ''
            } (${instance.status.toUpperCase()})`
          )
        })
    })
}
