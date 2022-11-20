import { exec } from 'child_process'
import { dbg, error } from '../util/logger'
import { safeCatch } from '../util/promiseHelper'

export const pexec = safeCatch(`pexec`, (cmd: string) => {
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
