import { PocketBase } from '@'
import { fileAccessSuspension } from './suspension'

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
  } else {
    await client.collection('users').authWithPassword(username, password)
  }
  const suspension = fileAccessSuspension(client.authStore.record as { suspension?: string } | null)
  if (suspension) {
    throw new Error(suspension)
  }
  return client
}
