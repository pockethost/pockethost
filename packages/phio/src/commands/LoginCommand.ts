import { input, password } from '@inquirer/prompts'
import { Command } from 'commander'
import * as EmailValidator from 'email-validator'
import { config } from '../lib/config'
import { PHIO_USERNAME } from '../lib/constants'
import { login } from './../lib/getClient'

export const loginWithUserInput = async () => {
  if (PHIO_USERNAME()) {
    throw new Error(
      'Cannot login with username and password if PHIO_USERNAME is set'
    )
  }

  while (true) {
    const email = await input({
      message: 'Enter your pockethost.io email address',
      default: config('email'),
      validate: (input: string) => {
        if (!EmailValidator.validate(input)) {
          return 'Invalid email address'
        }
        return true
      },
    })

    const pw = await password({
      message: 'Enter your pockethost.io password',
    })

    config(`email`, email)

    try {
      const authStore = await login(email, pw)

      config(`pb_auth`, authStore.exportToCookie())
    } catch (e) {
      console.error(
        `There was an error logging in. Please try again or go to https://pockethost.io to reset your password. (${e})`
      )
      continue
    }

    break
  }
  console.log(`Logged in!`)
}

export const LoginCommand = () =>
  new Command('login')
    .description(`Log in to PocketHost`)
    .helpOption(false)
    .action(loginWithUserInput)
