import * as winston from 'winston'
import 'winston-syslog'
import { SYSLOGD_PORT } from '..'
import { LoggerService } from '../common'

export function SyslogLogger(instanceId: string, target: string) {
  // @ts-ignore
  const syslogTransport = new winston.transports.Syslog({
    host: `localhost`,
    port: SYSLOGD_PORT(),
    app_name: instanceId,
  }) as winston.transport

  const logger = winston.createLogger({
    format: winston.format.printf((info) => {
      return info.message
    }),
    transports: [syslogTransport],
  })

  const { error, warn } = LoggerService()
    .create('SyslogLogger')
    .breadcrumb(instanceId)
    .breadcrumb(target)

  const api = {
    info: (msg: string) => {
      logger.info(msg)
    },
    error: (msg: string) => {
      logger.error(msg)
    },
    shutdown: () => {
      return new Promise<void>((resolve) => {
        logger.on('close', resolve)
        logger.close()
      })
    },
  }

  return api
}
