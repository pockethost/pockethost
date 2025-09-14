export const HandleMirrorData = (c: core.RequestEvent) => {
  const users = $app.findRecordsByExpr('verified_users', $dbx.exp('1=1'))

  const instances = $app
    .findRecordsByExpr('instances', $dbx.exp('instances.uid in (select id from verified_users)'))

  return c.json(200, { users, instances })
}
