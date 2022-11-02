import { UnsubFunc } from 'store/backend/types'
import { client } from '../client'

export const onAuthStateChanged = (
  cb: (user: typeof client.authStore.model) => void
): UnsubFunc => {
  setTimeout(() => cb(client.authStore.model), 0)
  return client.authStore.onChange(() => {
    cb(client.authStore.model)
  })
}
