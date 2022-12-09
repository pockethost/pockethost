import { binFor, RELEASES } from '@pockethost/common'
import { forEach } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { exec } from 'child_process'
import { existsSync } from 'fs'
import Listr from 'listr'

const DIST = process.env.DIST || `./dist`
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || `1`, 10)

const limiter = new Bottleneck({ maxConcurrent: MAX_CONCURRENT })

const pexec = (cmd: string, cwd = __dirname) => {
  return new Promise<void>((resolve, reject) => {
    console.log(cmd)
    exec(cmd, { cwd }, (err, stdout, stderr) => {
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

const tasks = new Listr([], { concurrent: true })
forEach(RELEASES, (info, platform) => {
  forEach(info.versions, (version) => {
    const bin = binFor(platform, version)
    const cmd = `VERSION=${version} PLATFORM=${platform} BIN=${bin} DIST=${DIST} ./build.sh`
    tasks.add({
      title: `${platform}: ${version} ${cmd}`,
      task: () =>
        limiter.schedule(async () => {
          const path = `./${DIST}/${bin}`
          if (existsSync(path)) return
          await pexec(cmd)
        }),
    })
  })
})
tasks.run().catch((err) => {
  console.error(err)
})
