import { mkLog } from '$util/Logger'
import { mkNotificationProcessor } from '$util/mkNotificationProcessor'

export const HandleProcessSingleNotification = (e: core.RequestEvent) => {
  const log = mkLog(`process_single_notification`)
  log(`start`)

  const test = !!e.request.url.query().get(`test`)
  const processNotification = mkNotificationProcessor(log, $app, test)

  try {
    const notification = $app.findFirstRecordByData(`notifications`, `delivered`, ``)
    if (!notification) {
      return e.json(200, `No notifications to send`)
    }
    processNotification(notification)
  } catch (err) {
    return e.json(500, `${err}`)
  }
  return e.json(200, { status: 'ok' })
}
