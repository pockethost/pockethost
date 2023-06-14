import {
  createCleanupManager,
  createEvent,
  mkSingleton,
  SingletonBaseConfig,
} from '@pockethost/common'
import Bottleneck from 'bottleneck'
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
  const connections: { [_: string]: Promise<SqliteServiceApi> } = {}

  const cm = createCleanupManager()

  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const getDatabase = async (filename: string): Promise<SqliteServiceApi> => {
    const _dbLogger = logger.create(`${filename}`)
    const { dbg } = _dbLogger

    trace(`Fetching database for ${filename}`, connections)
    if (!connections[filename]) {
      dbg(`${filename} is not yet opened`)

      connections[filename] = new Promise<SqliteServiceApi>(async (resolve) => {
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
            dbg(`Got a raw change event`, { eventType, database, table, rowId })
            if (eventType === 'delete') return // Not supported

            await limiter.schedule(async () => {
              const record = await db.get(
                `select * from ${table} where rowid = '${rowId}'`
              )
              const e: SqliteChangeEvent<any> = {
                table,
                action: eventType,
                record,
              }
              fireChange(e)
            })
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
        resolve(api)
      })
    }
    return connections[filename]!
  }

  const shutdown = async () => {
    dbg(`Shutting down sqlite service`)
    await limiter.stop()
    await cm.shutdown()
  }
  return {
    getDatabase,
    shutdown,
  }
})
