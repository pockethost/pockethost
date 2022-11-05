import { DEVELOPMENT } from '../constants'

export const dbg = (...args: any[]) => {
  if (!DEVELOPMENT) return
  console.log(...args)
}

export const info = (...args: any[]) => {
  console.log(...args)
}

export const error = (...args: any[]) => {
  console.error(...args)
}
