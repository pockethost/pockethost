import { Command } from 'commander'
import { formatInstance, listInstances } from '../lib/token'

export const ListCommand = () => {
  return new Command(`list`)
    .alias(`ls`)
    .description(`List the instances your token can reach`)
    .action(async () => {
      const instances = await listInstances()
      if (instances.length === 0) {
        console.log(
          `No instances. Your token may be limited to instances you no longer have.`
        )
        return
      }
      for (const instance of instances)
        console.log(`- ${formatInstance(instance)}`)
    })
}
