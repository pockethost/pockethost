import { existsSync } from 'fs'
import knex from 'knex'

export const createRawPbClient = (filename: string) => {
  if (!existsSync(filename)) {
    throw new Error(`${filename} not found for direct SQLite connection.`)
  }
  const conn = knex({
    client: 'sqlite3',
    connection: {
      filename,
    },
  })

  return conn
}
