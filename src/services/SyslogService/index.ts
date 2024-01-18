import { SYSLOGD_PORT } from '$constants'
import { LoggerService } from '$shared'
import * as winston from 'winston'
import 'winston-syslog'

const loggers: {
  [key: string]: {
    info: (msg: string) => void
    error: (msg: string) => void
  }
} = {}

export function SyslogLogger(instanceId: string, target: string) {
  const loggerKey = `${instanceId}_${target}`
  if (loggers[loggerKey]) {
    return loggers[loggerKey]!
  }

  const logger = winston.createLogger({
    format: winston.format.printf((info) => {
      return info.message
    }),
    transports: [
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
  }

  loggers[loggerKey] = api
  return api
}
