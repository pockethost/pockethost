import { keys, map } from '@s-libs/micro-dash'
import { ClientResponseError } from 'pocketbase'

export const parseError = (e: any): string[] => {
  if (e instanceof ClientResponseError) {
    if (e.data.message && keys(e.data.data).length === 0)
      return [e.data.message]
    return map(e.data.data, (v, k) => (v ? v.message : undefined)).filter(
      (v) => !!v,
    )
  }
  if (e instanceof Error) {
    return [e.message]
  }
  return [e.toString()]
}
