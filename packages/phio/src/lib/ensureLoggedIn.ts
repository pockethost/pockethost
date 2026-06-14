import { getClient } from '../lib/getClient'

export const ensureLoggedIn = async () => {
  const client = await getClient()
  if (!client.authStore.isValid) {
    throw new Error(`You must be logged in first. Use 'phio login'`)
  }
}
