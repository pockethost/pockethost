import { binFor, RELEASES } from '@pockethost/common'
import { forEach } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { exec } from 'child_process'
import Listr from 'listr'

const limiter = new Bottleneck({ maxConcurrent: 10 })

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
    const cmd = `VERSION=${version} PLATFORM=${platform} BIN=${binFor(
      platform,
      version
    )} ./build.sh`
    tasks.add({
      title: `${platform}: ${version}`,
      task: () => limiter.schedule(() => pexec(cmd)),
    })
  })
})
tasks.run().catch((err) => {
  console.error(err)
})
