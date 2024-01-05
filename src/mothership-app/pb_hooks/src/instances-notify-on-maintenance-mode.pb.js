/// <reference path="../types/types.d.ts" />

onModelAfterUpdate((e) => {
  const newModel = e.model
  const oldModel = e.model.originalCopy()

  const dbg = (s) => console.log(`***[maintenance mode]`, JSON.stringify(s))
  dbg(`top`)

  // Bail out if we aren't in maintenance mode
  const isMaintenance = newModel.get('maintenance')
  dbg({ isMaintenance })
  if (!isMaintenance) return

  // Bail out if the maintenance mode flag has not changed
  if (isMaintenance === oldModel.get(`maintenance`)) return

  dbg(`switched`)
  const uid = newModel.get(`uid`)
  const user = $app.dao().findRecordById('users', uid)

  // Bail out if the user has notifications disabled globally or for the instance
  const shouldNotify =
    user.getBool(`notifyMaintenanceMode`) &&
    newModel.getBool(`notifyMaintenanceMode`)
  dbg({ shouldNotify })
  if (!shouldNotify) return

  // Send the email warning about maintenance mode
  const instanceId = newModel.getId()
  const subdomain = newModel.getString(`subdomain`)
  const address = user.getString(`email`)
  dbg({ instanceId, subdomain, address })
  const email = new MailerMessage({
    from: {
      address: $app.settings().meta.senderAddress,
      name: $app.settings().meta.senderName,
    },
    to: [{ address }],
    subject: `Alert: ${subdomain} has been placed in Maintenance Mode`,
    html: `<p>This is a courtesy message to let you know that PocketHost has automatically placed your instance in Maintenance Mode. This is done as a security measure when your instance unexpectedly exits. <p>To investigate more, please visit https://app.pockethost.io/app/instances/${instanceId}/logs and https://pockethost.io/docs/usage/maintenance/`,
  })

  dbg(`sending`)
  $app.newMailClient().send(email)
}, 'instances')
