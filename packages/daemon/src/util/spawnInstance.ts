import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { AsyncReturnType } from 'type-fest'
import { DAEMON_PB_BIN_DIR, DAEMON_PB_DATA_DIR } from '../constants'
import { dbg } from './dbg'
import { mkInternalAddress, mkInternalUrl } from './internal'
import { tryFetch } from './tryFetch'
export type PocketbaseProcess = AsyncReturnType<typeof spawnInstance>

export type Config = {
  subdomain: string
  slug: string
  port: number
  bin: string
  onUnexpectedStop?: (code: number | null) => void
}

export const spawnInstance = async (cfg: Config) => {
  const { subdomain, port, bin, onUnexpectedStop, slug } = cfg
  const cmd = `${DAEMON_PB_BIN_DIR}/${bin}`
  if (!existsSync(cmd)) {
    throw new Error(
      `PocketBase binary (${bin}) not found. Contact pockethost.io.`
    )
  }

  const args = [
    `serve`,
    `--dir`,
    `${DAEMON_PB_DATA_DIR}/${slug}/pb_data`,
    `--http`,
    mkInternalAddress(port),
  ]
  dbg(`Spawning ${subdomain}`, { cmd, args })
  const ls = spawn(cmd, args)

  ls.stdout.on('data', (data) => {
    dbg(`${subdomain} stdout: ${data}`)
  })

  ls.stderr.on('data', (data) => {
    console.error(`${subdomain} stderr: ${data}`)
  })

  ls.on('close', (code) => {
    dbg(`${subdomain} closed with code ${code}`)
  })
  ls.on('exit', (code) => {
    if (code) {
      ;(
        onUnexpectedStop ||
        ((code) => {
          dbg(`Exited with ${code}`)
        })
      )(code)
    }
  })
  ls.on('error', (err) => {
    dbg(`${subdomain} had error ${err}`)
  })

  await tryFetch(mkInternalUrl(port))
  return {
    pid: ls.pid,
    kill: () => ls.kill(),
  }
}
