onAfterBootstrap((e) => {
  $app.dao?.()?.db().newQuery(`update instances set status='idle'`)?.execute()
  $app
    .dao?.()
    ?.db()
    .newQuery(`update invocations set endedAt=datetime('now') where endedAt=''`)
    ?.execute()
})

export {}
