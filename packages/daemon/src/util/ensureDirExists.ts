import { logger } from '@pockethost/common'
import { mkdirSync } from 'fs'

export const ensureDirExists = (path: string) => {
  const { dbg } = logger().create(`ensureDirExists`)

  try {
    mkdirSync(path)
  } catch (e) {
    dbg(`${e}`)
  }
}
