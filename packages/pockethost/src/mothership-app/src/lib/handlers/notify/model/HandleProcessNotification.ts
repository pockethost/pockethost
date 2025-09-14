import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { mkNotificationProcessor } from '$util/mkNotificationProcessor'

export const HandleProcessNotification = (e: core.RecordEvent) => {
  const dao = $app

  const log = mkLog(`notification:sendImmediately`)
  const audit = mkAudit(log, dao)
  const processNotification = mkNotificationProcessor(log, dao, false)

  const notificationRec = e.record

  
  log({ notificationRec })
  
  try {
    if (!notificationRec) throw new Error(`Missing notification record`)
    dao.expandRecord(notificationRec, ['message_template'])
    
    const messageTemplateRec = notificationRec?.expandedOne(`message_template`)
    if (!messageTemplateRec) {
      throw new Error(`Missing message template`)
    }
    processNotification(notificationRec)
  } catch (e) {
    audit(`ERROR`, `${e}`, {
      notification: notificationRec?.id,
    })
  }
  e.next()
}
