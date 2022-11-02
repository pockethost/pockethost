import { exec } from 'child_process'

export const pexec = (cmd: string) => {
  return new Promise<void>((resolve, reject) => {
    console.log(cmd)
    exec(cmd, (err, stdout, stderr) => {
      console.log(stdout)
      console.error(stderr)
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}
