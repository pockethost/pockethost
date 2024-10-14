/// <reference path="../types/types.d.ts" />
/// <reference path="../types/lib.d.ts" />

routerAdd(`GET`, `api/process_single_notification`, (c) => {
  const { mkLog, mkNotificationProcessor } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )
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
})

onModelAfterCreate((e) => {
  const dao = e.dao || $app.dao()
  const { mkNotificationProcessor, mkLog, mkAudit } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )
  const log = mkLog(`notification:sendImmediately`)
  const audit = mkAudit(log, dao)
  const processNotification = mkNotificationProcessor(log, dao, false)

  const notificationRec = /** @type {models.Record} */ (e.model)

  log({ notificationRec })

  try {
    dao.expandRecord(notificationRec, ['message_template'], null)

    const messageTemplateRec = notificationRec.expandedOne(`message_template`)
    if (!messageTemplateRec) {
      throw new Error(`Missing message template`)
    }
    processNotification(notificationRec)
  } catch (e) {
    audit(`ERROR`, `${e}`, {
      notification: notificationRec.getId(),
    })
  }
}, `notifications`)
