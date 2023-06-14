import { Logger } from '@pockethost/common'
import { existsSync } from 'fs'
import knex from 'knex'

export const createRawPbClient = (filename: string, logger: Logger) => {
  const { dbg } = logger.create(`rawPbClient`)
  dbg(filename)

  if (!existsSync(filename)) {
    throw new Error(`${filename} not found for direct SQLite connection.`)
  }

  const conn = knex({
    client: 'sqlite3',
    connection: {
      filename,
    },
    useNullAsDefault: true,
  })

  return conn
}
