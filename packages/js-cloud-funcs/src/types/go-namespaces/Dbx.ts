import { SqlResult } from './Sql'

export type DbxQuery = {
  // https://pkg.go.dev/github.com/pocketbase/dbx#Query
  // https://pkg.go.dev/github.com/pocketbase/dbx#Query.Execute
  execute: () => SqlResult
  all: <TRow>(rows: TRow[]) => void
  one: <TRow>(row: TRow) => void
}

export type DbxBuilder = {
  // https://pkg.go.dev/github.com/pocketbase/dbx#Builder
  newQuery: (sql: string) => DbxQuery
}
