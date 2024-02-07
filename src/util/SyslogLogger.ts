import { SYSLOGD_PORT } from '$constants'
import { LoggerService } from '$shared'
import * as winston from 'winston'
import 'winston-syslog'

export function SyslogLogger(instanceId: string, target: string) {
  const logger = winston.createLogger({
    format: winston.format.printf((info) => {
      return info.message
    }),
    transports: [
      // @ts-ignore
      new winston.transports.Syslog({
        host: `localhost`,
        port: SYSLOGD_PORT(),
        app_name: instanceId,
      }),
    ],
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
      logger.close()
    },
  }

  return api
}
