import { LoggerService } from '@pockethost/common'
import { mkdirSync } from 'fs'

export const ensureDirExists = (path: string) => {
  const { dbg } = LoggerService().create(`ensureDirExists`)

  try {
    mkdirSync(path)
  } catch (e) {
    dbg(`${e}`)
  }
}
