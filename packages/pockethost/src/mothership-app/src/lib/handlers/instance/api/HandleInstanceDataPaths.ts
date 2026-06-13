export const HandleInstanceDataPaths = (c: echo.Context) => {
  const records = $app.dao().findRecordsByExpr('instances', $dbx.exp('1=1'))
  const instances: { id: string; volume: string }[] = []

  for (const record of records) {
    instances.push({
      id: record.id,
      volume: record.getString('volume') ?? '',
    })
  }

  return c.json(200, { instances })
}
