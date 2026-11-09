import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'

export const AfterCreate_notify_discord = (e: core.RecordCreateEvent) => {
  const log = mkLog(`instances:create:discord:notify`)
  const audit = mkAudit(log, $app)

  const record = e.record
  if (!record) return

  const webhookUrl = process.env.DISCORD_STREAM_CHANNEL_URL
  if (!webhookUrl) {
    return
  }
  const version = record.get('version')

  try {
    $http.send({
      url: webhookUrl,
      method: 'POST',
      body: JSON.stringify({
        content: `Someone just created an app running PocketBase v${version}`,
      }),
      headers: { 'content-type': 'application/json' },
      timeout: 5, // in seconds
    })
  } catch (e) {
    audit(`ERROR`, `Instance creation discord notify failed with ${e}`)
  }
}
