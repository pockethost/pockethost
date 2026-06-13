import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { mkNotificationProcessor } from '$util/mkNotificationProcessor'

export const HandleProcessNotification = (e: core.RecordCreateEvent) => {
  const log = mkLog(`notification:sendImmediately`)
  const audit = mkAudit(log, $app)
  const processNotification = mkNotificationProcessor(log, $app, false)

  const notificationRec = e.record
  if (!notificationRec) return

  log({ notificationRec })

  try {
    $app.expandRecord(notificationRec, ['message_template'])

    const messageTemplateRec = notificationRec.expandedOne(`message_template`)
    if (!messageTemplateRec) {
      throw new Error(`Missing message template`)
    }
    processNotification(notificationRec)
  } catch (e) {
    audit(`ERROR`, `${e}`, {
      notification: notificationRec.id,
    })
  }
}
