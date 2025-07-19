export const HandleMirrorData = (c: echo.Context) => {
  const users = $app.dao().findRecordsByExpr('verified_users', $dbx.exp('1=1'))

  const instances = $app
    .dao()
    .findRecordsByExpr('instances', $dbx.exp('instances.uid in (select id from verified_users)'))

  return c.json(200, { users, instances })
}
