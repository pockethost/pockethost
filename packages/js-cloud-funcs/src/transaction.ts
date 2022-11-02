export type TransactionApi = {
  execute: (sql: string) => void
  all: <TRow>(sql: string) => TRow[]
  one: <TRow>(sql: string) => TRow
}

export type TransactionCallback = (api: TransactionApi) => void

export const runInTransaction = (cb: TransactionCallback) => {
  __go.app.dao().runInTransaction((txDao) => {
    const execute = (sql: string) => {
      const q = txDao.dB().newQuery(sql)
      return q.execute()
    }
    const all = <TRow>(sql: string): TRow[] => {
      const q = txDao.dB().newQuery(sql)
      const rowPtr = __go.newNullStringMapArrayPtr<TRow>()
      q.all(rowPtr)
      console.log({ rowPtr })
      return []
    }
    const one = <TRow>(sql: string): TRow => {
      const q = txDao.dB().newQuery(sql)
      const row = __go.newNullStringMap<TRow>()
      q.one(row)
      return row
    }

    const api: TransactionApi = {
      execute,
      all,
      one,
    }
    cb(api)
  })
}
