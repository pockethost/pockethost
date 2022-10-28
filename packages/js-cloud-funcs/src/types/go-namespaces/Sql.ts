export type SqlResult = {
  // https://pkg.go.dev/database/sql#Result
  // statements varies.
  lastInsertId: () => number

  // RowsAffected returns the number of rows affected by an
  // update, insert, or delete. Not every database or database
  // driver may support this.
  rowsAffected: () => number
}
