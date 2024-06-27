/// <reference path="../types/types.d.ts" />

onModelAfterCreate((e) => {
  const dao = e.dao || $app.dao()
  const { audit, mkLog } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))

  const log = mkLog(`instances:create:discord:notify`)

  const webhookUrl = $os.getenv('DISCORD_POCKETSTREAM_URL')
  if (!webhookUrl) {
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
    audit(`ERROR`, `Instance creation discord notify failed with ${e}`, {
      log,
      dao,
    })
  }
}, 'instances')
