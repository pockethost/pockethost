import { input, password } from '@inquirer/prompts'
import { Command } from 'commander'
import { config } from '../lib/config'
import { USERNAME } from '../lib/constants'
import { login } from './../lib/getClient'
import { saveToken } from './TokenCommand'

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const loginWithUserInput = async () => {
  if (USERNAME()) {
    throw new Error(
      'Cannot login with username and password if POCKETHOST_USERNAME is set'
    )
  }

  while (true) {
    const email = await input({
      message: 'Enter your pockethost.io email address',
      default: config('email'),
      validate: (input: string) => {
        if (!isValidEmail(input)) {
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
    .description(`Log in to PocketHost (email/password, or --token)`)
    .option(`--token [token]`, `Log in with a personal access token instead`)
    .action(async (opts: { token?: string | boolean }) => {
      if (opts.token !== undefined) {
        await saveToken(typeof opts.token === 'string' ? opts.token : undefined)
        return
      }
      await loginWithUserInput()
    })
