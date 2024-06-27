import { forEach } from '@s-libs/micro-dash'

export const logSettings = (settings: { [_: string]: any }) => {
  forEach(settings, (v, k) => {
    console.log(`${k}: ${v}`)
  })
}
