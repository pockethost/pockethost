import { Command } from 'commander'
import { config } from '../lib/config'

export const logout = async () => {
  config(`pb_auth`, '')
  config(`token`, '')
  console.log(`Logged out! (saved login and token removed)`)
}

export const LogoutCommand = () =>
  new Command('logout')
    .description(`Log out of PocketHost`)
    .helpOption(false)
    .action(logout)
