import { Logger, safeCatch } from '@pockethost/common'
import { exec } from 'child_process'

export const pexec = (logger: Logger) =>
  safeCatch(`pexec`, logger, (cmd: string) => {
    const { dbg, error } = logger.create('pexec')
    return new Promise<void>((resolve, reject) => {
      dbg(cmd)
      exec(cmd, (err, stdout, stderr) => {
        dbg(stdout)
        if (err) {
          error(`${err}`)
          error(stderr)
          reject(err)
          return
        }
        resolve()
      })
    })
  })
