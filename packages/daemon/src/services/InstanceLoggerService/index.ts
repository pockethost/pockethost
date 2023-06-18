import { DAEMON_PB_DATA_DIR } from '$constants'
import { sqliteService } from '$services'
import {
  InstanceId,
  mkSingleton,
  SingletonBaseConfig,
  StreamNames,
} from '@pockethost/common'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { DaemonContext } from './DaemonContext'
import { createSqliteLogger, SqliteLogger } from './SqliteLogger'

const instances: {
  [instanceId: InstanceId]: SqliteLogger
} = {}

export const createInstanceLogger = async (
  instanceId: InstanceId,
  context: DaemonContext
) => {
  const { parentLogger } = context
  const _instanceLogger = parentLogger.create(`InstanceLogger`)

  if (!instances[instanceId]) {
    const loggerApi = await (async () => {
      const _thisLogger = _instanceLogger.create(instanceId)
      const { dbg } = _thisLogger

      const logDbPath = join(
        DAEMON_PB_DATA_DIR,
        instanceId,
        'pb_data',
        'instance_logs.db'
      )

      dbg(`logs path`, logDbPath)
      mkdirSync(dirname(logDbPath), { recursive: true })

      dbg(`Running migrations`)
      const { getDatabase } = sqliteService()
      const db = await getDatabase(logDbPath)
      await db.migrate({
        migrationsPath: join(__dirname, 'migrations'),
      })

      const api = await createSqliteLogger(logDbPath, {
        parentLogger: _instanceLogger,
      })
      await api.write(`Ran migrations`, StreamNames.System)
      return api
    })()
    instances[instanceId] = loggerApi
  }

  return instances[instanceId]!
}

export type InstanceLoggerServiceConfig = SingletonBaseConfig

export const instanceLoggerService = mkSingleton(
  (config: InstanceLoggerServiceConfig) => {
    const { logger } = config
    const { dbg } = logger.create(`InstanceLoggerService`)
    dbg(`Starting up`)
    return {
      get: createInstanceLogger,
      shutdown() {
        dbg(`Shutting down`)
      },
    }
  }
)
