export const HandleStatsRequest = (c: core.RequestEvent) => {
  const result = new DynamicModel({
    total_flounder_subscribers: 0,
  })

  $app.db().select('total_flounder_subscribers').from('stats').one(result)

  return c.json(200, result)
}
