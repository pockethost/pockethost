/// <reference path="../types/types.d.ts" />

routerAdd(`GET`, `api/process_single_notification`, (c) => {
  const { mkLog, processNotification } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )
  const log = mkLog(`process_single_notification`)
  log(`start`)

  try {
    const notification = $app
      .dao()
      .findFirstRecordByData(`notifications`, `delivered`, ``)
    if (!notification) {
      return c.json(200, `No notifications to send`)
    }
    processNotification(notification, { log, test: !!c.queryParam(`test`) })
  } catch (e) {
    c.json(500, `${e}`)
  }
  return c.json(200, { status: 'ok' })
})

onModelAfterCreate((e) => {
  return
  const { processNotification, mkLog, audit } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )
  const log = mkLog(`notification:sendImmediately`)

  const notificationRec = /** @type {models.Record} */ (e.model)

  log({ notificationRec })

  try {
    $app.dao().expandRecord(notificationRec, ['message_template'], null)

    const messageTemplateRec = notificationRec.expandedOne(`message_template`)
    if (!messageTemplateRec) {
      throw new Error(`Missing message template`)
    }
    if ([`maintenance-mode`].includes(messageTemplateRec.getString(`slug`))) {
      processNotification(notificationRec, { log })
    }
  } catch (e) {
    audit(`ERROR`, `${e}`, {
      log,
      extra: {
        notification: notificationRec.getId(),
      },
    })
  }
}, `notifications`)
