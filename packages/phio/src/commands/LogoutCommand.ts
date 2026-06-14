import { Command } from 'commander'
import { config } from '../lib/config'

export const logout = async () => {
  config(`pb_auth`, '')
  console.log(`Logged out!`)
}

export const LogoutCommand = () =>
  new Command('logout')
    .description(`Log out of PocketHost`)
    .helpOption(false)
    .action(logout)
