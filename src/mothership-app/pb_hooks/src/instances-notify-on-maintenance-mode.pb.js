onModelAfterUpdate((e) => {
  const dao = e.dao || $app.dao()

  const newModel = /** @type {models.Record} */ (e.model)
  const oldModel = newModel.originalCopy()

  const { mkLog, enqueueNotification } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )

  const log = mkLog(`maintenance-mode`)

  // Bail out if we aren't in maintenance mode
  const isMaintenance = newModel.get('maintenance')
  // log({ isMaintenance })
  if (!isMaintenance) return

  // Bail out if the maintenance mode flag has not changed
  if (isMaintenance === oldModel.get(`maintenance`)) return

  log(`switched`)
  const uid = newModel.get(`uid`)
  const user = dao.findRecordById('users', uid)

  // Bail out if the user has notifications disabled globally or for the instance
  const shouldNotify =
    user.getBool(`notifyMaintenanceMode`) &&
    newModel.getBool(`notifyMaintenanceMode`)
  log({ shouldNotify })
  if (!shouldNotify) return

  // Send the email warning about maintenance mode
  const instanceId = newModel.getId()
  const subdomain = newModel.getString(`subdomain`)
  const address = user.getString(`email`)
  log({ instanceId, subdomain, address })
  enqueueNotification(`email`, `maintenance_mode`, uid, {
    log,
    dao,
    message_template_vars: {
      subdomain,
      instanceId,
    },
  })
}, 'instances')
