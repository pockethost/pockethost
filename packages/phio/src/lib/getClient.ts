import PocketBase from 'pocketbase'
import { runTasks } from './../lib/Task'
import { config } from './config'
import { PHIO_MOTHERSHIP_URL, PHIO_PASSWORD, PHIO_USERNAME } from './constants'
import { ensureDeployKey } from './deployKey'
import { ensureLoggedIn } from './ensureLoggedIn'

let client: PocketBase | undefined

export type AuthStatus =
  | { state: 'logged_out' }
  | { state: 'session_expired'; email: string }
  | { state: 'authenticated'; email: string; client: PocketBase }

export const resolveAuthStatus = async (): Promise<AuthStatus> => {
  const savedEmail = config('email')
  const client = await getClient()

  if (client.authStore.isValid) {
    const email =
      (client.authStore.record?.email as string | undefined) || savedEmail || ''
    return { state: 'authenticated', email, client }
  }

  if (savedEmail) {
    return { state: 'session_expired', email: savedEmail }
  }

  return { state: 'logged_out' }
}

export const getClient = async () => {
  if (client) {
    return client
  }
  client = new PocketBase(PHIO_MOTHERSHIP_URL())

  if (PHIO_USERNAME()) {
    try {
      await unsafeLogin(PHIO_USERNAME(), PHIO_PASSWORD())
      return client
    } catch (e) {
      throw new Error(
        `There was an error logging in. Please try again or go to https://pockethost.io to reset your password.`
      )
    }
  }

  const cookie = config('pb_auth')
  if (cookie) {
    client.authStore.loadFromCookie(cookie)
    // console.log({ valid: client.authStore.isValid })
    client.authStore.onChange((token, record) => {
      if (!client) {
        console.warn('No client found - please report this bug')
        return
      }
      config('pb_auth', client.authStore.exportToCookie())
    })
    try {
      await client.collection(`users`).authRefresh()
      config(`pb_auth`, client.authStore.exportToCookie())
    } catch {
      client.authStore.clear()
    }
  }
  return client
}

export const getInstanceBySubdomainCnameOrId = async (search: string) => {
  await ensureLoggedIn()
  const client = await getClient()
  return await client
    .collection(`instances`)
    .getFirstListItem(
      `id='${search}' || subdomain='${search}' || cname='${search}'`
    )
}

const unsafeLogin = async (username: string, password: string) => {
  if (!client) {
    throw new Error('No client found')
  }
  await runTasks([
    {
      name: `Logging in`,
      run: async () => {
        if (!client) {
          throw new Error('No client found')
        }
        const res = await client
          .collection('users')
          .authWithPassword(username, password)
      },
    },
  ])
  return client.authStore
}

export const login = async (username: string, password: string) => {
  const client = await getClient()
  await unsafeLogin(username, password)
  await ensureDeployKey(client)
  return client.authStore
}
