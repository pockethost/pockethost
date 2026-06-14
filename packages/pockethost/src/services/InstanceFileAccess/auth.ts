import { PocketBase } from '@'

export async function authenticateFileAccess(
  mothershipUrl: string,
  username: string,
  password: string
): Promise<PocketBase> {
  const client = new PocketBase(mothershipUrl)
  if (username === `__auth__`) {
    client.authStore.loadFromCookie(password)
    if (!client.authStore.isValid) {
      throw new Error(`Invalid cookie`)
    }
    return client
  }
  await client.collection('users').authWithPassword(username, password)
  return client
}
