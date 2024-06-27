import * as dgram from 'dgram'
import {
  LoggerService,
  PocketHostAction,
  action,
  enqueueJob,
} from 'pockethost/core'
import parse from 'syslog-parse'
import { SYSLOGD_PORT } from '../../constants'

export function syslog() {
  return new Promise<void>((resolve) => {
    const logger = LoggerService().create(`EdgeSyslogCommand`)
    const { dbg, error, info, warn } = logger
    info(`Starting`)

    const PORT = SYSLOGD_PORT()
    const HOST = '0.0.0.0'

    const server = dgram.createSocket('udp4')

    server.on('error', (err) => {
      console.log(`Server error:\n${err.stack}`)
      server.close()
    })

    server.on('message', (msg, rinfo) => {
      const raw = msg.toString()
      const parsed = parse(raw)
      if (!parsed) {
        return
      }
      dbg(parsed)

      const { process: instanceId, severity, message } = parsed

      enqueueJob(instanceId, async () => {
        const instance = await getInstanceById(instanceId)
      })
      action(PocketHostAction.Core_InstanceLog, {
        instance,
        type: severity === 'info' ? 'stdout' : 'stderr',
        data: message,
      })
      const logger = InstanceLogger(instanceId, `exec`, { ttl: 5000 })
      if (severity === 'info') {
        logger.info(message)
      } else {
        logger.error(message)
      }
    })

    server.on('listening', () => {
      const address = server.address()
      info(`Server listening ${address.address}:${address.port}`)
      resolve()
    })

    server.bind(PORT, HOST)
  })
}
