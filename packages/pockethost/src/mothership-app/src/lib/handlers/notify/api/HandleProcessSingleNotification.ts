import { mkLog } from '$util/Logger'
import { mkNotificationProcessor } from '$util/mkNotificationProcessor'

export const HandleProcessSingleNotification = (c: echo.Context) => {
  const log = mkLog(`process_single_notification`)
  log(`start`)

  const dao = $app.dao()

  const processNotification = mkNotificationProcessor(
    log,
    dao,
    !!c.queryParam(`test`),
  )

  try {
    const notification = dao.findFirstRecordByData(
      `notifications`,
      `delivered`,
      ``,
    )
    if (!notification) {
      return c.json(200, `No notifications to send`)
    }
    processNotification(notification)
  } catch (e) {
    c.json(500, `${e}`)
  }
  return c.json(200, { status: 'ok' })
}
