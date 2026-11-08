import { Command } from 'commander'
import { config } from '../lib/config'

export const logout = async () => {
  config(`token`, '')
  config(`pb_auth`, '')
  console.log(
    `Logged out (saved token removed). To revoke the token itself, delete it at https://app.pockethost.io/account/tokens.`
  )
}

export const LogoutCommand = () =>
  new Command('logout')
    .description(`Remove the saved token from this computer`)
    .action(logout)
