import { SqliteChangeEvent, sqliteService } from '$services'
import {
  InstanceLogFields,
  InstanceLogFields_Create,
  newId,
  pocketNow,
  RecordId,
  safeCatch,
  StreamNames,
} from '@pockethost/common'
import knex from 'knex'
import { AsyncReturnType } from 'type-fest'
import { DaemonContext } from './DaemonContext'

export type SqliteLogger = AsyncReturnType<typeof createSqliteLogger>
export const createSqliteLogger = async (
  logDbPath: string,
  context: DaemonContext
) => {
  const { parentLogger } = context
  const _dbLogger = parentLogger.create(`${logDbPath}`)
  const { dbg, trace } = _dbLogger

  const { getDatabase } = sqliteService()
  const db = await getDatabase(logDbPath)

  const conn = knex({
    client: 'sqlite3',
    connection: {
      filename: logDbPath,
    },
    useNullAsDefault: true,
  })

  const write = safeCatch(
    `write`,
    _dbLogger,
    async (message: string, stream: StreamNames = StreamNames.Info) => {
      const _in: InstanceLogFields_Create = {
        id: newId(),
        message,
        stream,
        created: pocketNow(),
        updated: pocketNow(),
      }
      const sql = conn('logs').insert(_in).toString()
      trace(`Writing log ${JSON.stringify(_in)} ${sql}`)
      await db.exec(sql)
    }
  )

  const subscribe = (cb: (e: SqliteChangeEvent<InstanceLogFields>) => void) => {
    let _seenIds: { [_: RecordId]: boolean } | undefined = {}

    const unsub = db.subscribe<InstanceLogFields>((e) => {
      // dbg(`Caught db modification ${logDbPath}`, e)
      const { table, record } = e
      if (table !== 'logs') return
      if (_seenIds) {
        _seenIds[record.id] = true
      }
      cb(e)
    })
    return unsub
  }

  const fetch = async (limit: number = 100) => {
    return db.all<InstanceLogFields[]>(
      `select * from logs order by created desc limit ${limit}`
    )
  }

  return { write, subscribe, fetch }
}
