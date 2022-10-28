import { identity } from 'ts-brand'
import { client } from '../client'
import { Pb_UserId } from '../schema/base'

export const pbUid = () => {
  const { id } = client.authStore.model || {}
  if (!id) return
  return identity<Pb_UserId>(id)
}
