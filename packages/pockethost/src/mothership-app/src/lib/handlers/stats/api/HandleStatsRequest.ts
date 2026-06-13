export const HandleStatsRequest = (e: core.RequestEvent) => {
  const total_flounder_subscribers = $app.countRecords(
    `users`,
    $dbx.exp(`subscription = 'flounder' && verified = 1`)
  )

  return e.json(200, { total_flounder_subscribers })
}
