import {
  createCleanupManager,
  LoggerService,
  mkSingleton,
  serialAsyncExecutionGuard,
  SingletonBaseConfig,
} from '$shared'
import knex from 'knex'

export type SqliteServiceApi = ReturnType<typeof knex>
export type SqliteServiceConfig = SingletonBaseConfig & {}

export type SqliteService = ReturnType<typeof SqliteService>

export const SqliteService = mkSingleton((config: SqliteServiceConfig) => {
  const { dbg, trace } = LoggerService().create(`sqliteService`)
  const connections: { [_: string]: SqliteServiceApi } = {}

  const cm = createCleanupManager()

  /*
  This function 
  */
  const _unsafe_getDatabase = async (
    filename: string,
  ): Promise<SqliteServiceApi> => {
    const _dbLogger = LoggerService().create(`SqliteService`)
    _dbLogger.breadcrumb(filename)
    const { dbg, error, abort } = _dbLogger

    trace(`Fetching database`, connections)
    if (!connections[filename]) {
      dbg(`Not yet opened`)

      const api = await (async () => {
        dbg(`Opening ${filename}`)

        const db = knex({
          client: 'sqlite3', // or 'better-sqlite3'
          connection: {
            filename,
          },
        })

        cm.add(() => {
          dbg(`Closing connection`)
          db.destroy()
        })

        return db
      })().catch(error)
      if (!api) {
        throw new Error(`Unable to connect to SQLite`)
      }
      connections[filename] = api
    }
    return connections[filename]!
  }
  const getDatabase = serialAsyncExecutionGuard(
    _unsafe_getDatabase,
    (fileName) => fileName,
  )

  const shutdown = async () => {
    dbg(`Shutting down sqlite service`)
    await cm.shutdown()
  }
  return {
    getDatabase,
    shutdown,
  }
})
