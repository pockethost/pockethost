/// <reference path="../types/types.d.ts" />

onModelBeforeUpdate((e) => {
  const dao = e.dao || $app.dao()
  const newModel = /** @type {models.Record} */ (e.model)
  const oldModel = newModel.originalCopy()

  const { mkAudit, mkLog, mkNotifier } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )

  const log = mkLog(`user-welcome-msg`)
  const notify = mkNotifier(log, dao)
  const audit = mkAudit(log, dao)

  try {
    log({ newModel, oldModel })

    // Bail out if we aren't verified
    const isVerified = newModel.getBool('verified')
    if (!isVerified) return

    // Bail out if the verified mode flag has not changed
    if (isVerified === oldModel.getBool(`verified`)) return

    log(`user just became verified`)
    const uid = newModel.getId()

    notify(`email`, `welcome`, uid)
    newModel.set(`welcome`, new DateTime())
  } catch (e) {
    audit(`ERROR`, `${e}`, { user: newModel.getId() })
  }
}, 'users')
