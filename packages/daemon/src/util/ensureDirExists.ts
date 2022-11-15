import { mkdirSync } from 'fs'
import { dbg } from './dbg'

export const ensureDirExists = (path: string) => {
  try {
    mkdirSync(path)
  } catch (e) {
    dbg(`${e}`)
  }
}
