import {
  DEBUG,
  DefaultSettingsService,
  SETTINGS,
  SYSLOGD_PORT,
} from '$constants'
import { InstanceLogger } from '$services'
import { LogLevelName, LoggerService } from '$src/shared'
import * as dgram from 'dgram'
import parse from 'syslog-parse'

const server = dgram.createSocket('udp4')

DefaultSettingsService(SETTINGS)

const PORT = SYSLOGD_PORT()
const HOST = '0.0.0.0'

const { dbg, info, error } = LoggerService({
  level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
}).create(`edge-syslogd`)

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

  const logger = InstanceLogger(instanceId, `exec`, { ttl: 5000 })
  if (severity === 'info') {
    logger.info(message)
  } else {
    logger.error(message)
  }
})

server.on('listening', () => {
  const address = server.address()
  console.log(`Server listening ${address.address}:${address.port}`)
})

server.bind(PORT, HOST)
