import { LoggerService } from '$shared'
import { mkdirSync } from 'fs'

export const ensureDirExists = (path: string) => {
  const { dbg } = LoggerService().create(`ensureDirExists`)

  try {
    mkdirSync(path)
  } catch (e) {
    dbg(`${e}`)
  }
}
