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
    processNotification(notification, { log, test: true })
  } catch (e) {
    c.json(500, `${e}`)
  }
  return c.json(200, { status: 'ok' })
})

onModelAfterCreate((e) => {
  const { processNotification, mkLog } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )
  const log = mkLog(`notification:afterCreate`)
  log(`start`)
  // processNotification(e.model, { log })
}, `notifications`)
