import { map } from '@s-libs/micro-dash'
import { ClientResponseError } from 'pocketbase'

export const parseError = (e) => {
  if (e instanceof ClientResponseError) {
    const { data } = e
    if (!data || !data.data) {
      return `Unknown error ${e.message}`
    }
    return map(data.data, (v, k) => (v ? v.message : undefined))
      .filter((v) => !!v)
      .join('<br/>')
  } else {
    return `Unknown error ${e.message}`
  }
}
