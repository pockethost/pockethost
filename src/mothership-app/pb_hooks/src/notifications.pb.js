/// <reference path="../types/types.d.ts" />

routerAdd(`GET`, `api/process_single_notification`, (c) => {
  const { mkLog, processNotification } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )
  const log = mkLog(`process_single_notification`)
  log(`start`)

  const dao = $app.dao()
  try {
    const notification = dao.findFirstRecordByData(
      `notifications`,
      `delivered`,
      ``,
    )
    if (!notification) {
      return c.json(200, `No notifications to send`)
    }
    processNotification(notification, {
      log,
      dao,
      test: !!c.queryParam(`test`),
    })
  } catch (e) {
    c.json(500, `${e}`)
  }
  return c.json(200, { status: 'ok' })
})

onModelAfterCreate((e) => {
  const dao = e.dao || $app.dao()
  return
  const { processNotification, mkLog, audit } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )
  const log = mkLog(`notification:sendImmediately`)

  const notificationRec = /** @type {models.Record} */ (e.model)

  log({ notificationRec })

  try {
    dao.expandRecord(notificationRec, ['message_template'], null)

    const messageTemplateRec = notificationRec.expandedOne(`message_template`)
    if (!messageTemplateRec) {
      throw new Error(`Missing message template`)
    }
    if ([`maintenance-mode`].includes(messageTemplateRec.getString(`slug`))) {
      processNotification(notificationRec, { log, dao })
    }
  } catch (e) {
    audit(`ERROR`, `${e}`, {
      log,
      dao,
      extra: {
        notification: notificationRec.getId(),
      },
    })
  }
}, `notifications`)
