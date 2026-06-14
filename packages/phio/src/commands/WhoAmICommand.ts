import { Command } from 'commander'
import { config } from '../lib/config'

export const WhoAmICommand = () => {
  return new Command(`whoami`)
    .description(`Show the current user`)
    .action(() => {
      const email = config(`email`)
      if (email) {
        console.log(`Current user is: ${email}`)
        return
      }
      console.log(`No user is currently logged in`)
    })
}
