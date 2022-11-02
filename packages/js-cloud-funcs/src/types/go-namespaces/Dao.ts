import { DbxBuilder } from './Dbx'

export type DaoTransactionCallback = (txDao: Dao) => void

export type Dao = {
  // https://pkg.go.dev/github.com/pocketbase/pocketbase@v0.7.9/daos
  runInTransaction: (cb: DaoTransactionCallback) => void
  dB: () => DbxBuilder
}
