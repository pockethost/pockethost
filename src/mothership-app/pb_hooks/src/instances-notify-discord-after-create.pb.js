/// <reference path="../types/types.d.ts" />

onModelAfterCreate((e) => {
  const webhookUrl = $os.getenv('DISCORD_POCKETSTREAM_URL')
  if (!webhookUrl) {
    console.warn(`***DISCORD_POCKETSTREAM_URL not defined`)
    return
  }
  const version = e.model.get('version')

  try {
    const res = $http.send({
      url: webhookUrl,
      method: 'POST',
      body: JSON.stringify({
        content: `Someone just created an app running PocketBase v${version}`,
      }),
      headers: { 'content-type': 'application/json' },
      timeout: 5, // in seconds
    })
  } catch (e) {
    console.error(`***${e}`)
  }
}, 'instances')
