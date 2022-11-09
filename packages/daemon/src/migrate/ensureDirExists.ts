import { mkdirSync } from 'fs'
import { dbg } from '../util/dbg'

export const ensureDirExists = (path: string) => {
  try {
    mkdirSync(path)
  } catch (e) {
    dbg(`${e}`)
  }
}
