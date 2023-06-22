import {
  createCleanupManager,
  createEvent,
  mkSingleton,
  serialAsyncExecutionGuard,
  SingletonBaseConfig,
} from '@pockethost/common'
import { Database as SqliteDatabase, open } from 'sqlite'
import { Database } from 'sqlite3'
import { JsonObject } from 'type-fest'

export type SqliteUnsubscribe = () => void
export type SqliteChangeHandler<TRecord extends JsonObject> = (
  e: SqliteChangeEvent<TRecord>
) => void
export type SqliteEventType = 'update' | 'insert' | 'delete'
export type SqliteChangeEvent<TRecord extends JsonObject> = {
  table: string
  action: SqliteEventType
  record: TRecord
}
export type SqliteServiceApi = {
  all: SqliteDatabase['all']
  get: SqliteDatabase['get']
  migrate: SqliteDatabase['migrate']
  exec: SqliteDatabase['exec']
  subscribe: <TRecord extends JsonObject>(
    cb: SqliteChangeHandler<TRecord>
  ) => SqliteUnsubscribe
}
export type SqliteServiceConfig = SingletonBaseConfig & {}

export type SqliteService = ReturnType<typeof sqliteService>

export const sqliteService = mkSingleton((config: SqliteServiceConfig) => {
  const { logger } = config
  const { dbg, trace } = logger.create(`sqliteService`)
  const connections: { [_: string]: SqliteServiceApi } = {}

  const cm = createCleanupManager()

  /*
  This function 
  */
  const _unsafe_getDatabase = async (
    filename: string
  ): Promise<SqliteServiceApi> => {
    const _dbLogger = logger.create(`SqliteService`)
    _dbLogger.breadcrumb(filename)
    const { dbg, error, abort } = _dbLogger

    trace(`Fetching database`, connections)
    if (!connections[filename]) {
      dbg(`Not yet opened`)

      const api = await (async () => {
        const db = await open({ filename, driver: Database })
        dbg(`Database opened`)
        db.db.addListener(
          'change',
          async (
            eventType: SqliteEventType,
            database: string,
            table: string,
            rowId: number
          ) => {
            trace(`Got a raw change event`, {
              eventType,
              database,
              table,
              rowId,
            })
            if (eventType === 'delete') return // Not supported

            const record = await db.get(
              `select * from ${table} where rowid = '${rowId}'`
            )
            const e: SqliteChangeEvent<any> = {
              table,
              action: eventType,
              record,
            }
            fireChange(e)
          }
        )

        cm.add(() => {
          dbg(`Closing connection`)
          db.db.removeAllListeners()
          db.close()
        })
        db.migrate

        const [onChange, fireChange] = createEvent<SqliteChangeEvent<any>>()
        const api: SqliteServiceApi = {
          all: db.all.bind(db),
          get: db.get.bind(db),
          migrate: db.migrate.bind(db),
          exec: db.exec.bind(db),
          subscribe: onChange,
        }
        return api
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
    (fileName) => fileName
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
