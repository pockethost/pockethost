// Bulk mail on the CE ext/bulkmail schema. Routes match the CE plugin so the CLI keeps working after the cutover.

routerAdd(
  'GET',
  '/api/bulkmail/settings',
  (e) => require(`${__hooks}/mothership`).HandleBulkMailGetSettings(e),
  $apis.requireSuperuserAuth()
)
routerAdd(
  'PATCH',
  '/api/bulkmail/settings',
  (e) => require(`${__hooks}/mothership`).HandleBulkMailSaveSettings(e),
  $apis.requireSuperuserAuth()
)
routerAdd(
  'POST',
  '/api/bulkmail/audience/count',
  (e) => require(`${__hooks}/mothership`).HandleBulkMailCount(e),
  $apis.requireSuperuserAuth()
)
routerAdd(
  'POST',
  '/api/bulkmail/campaigns/{id}/{action}',
  (e) => require(`${__hooks}/mothership`).HandleBulkMailCampaignAction(e),
  $apis.requireSuperuserAuth()
)

routerAdd('GET', '/api/bulkmail/unsubscribe', (e) => require(`${__hooks}/mothership`).HandleBulkMailUnsubscribePage(e))
routerAdd('POST', '/api/bulkmail/unsubscribe', (e) => require(`${__hooks}/mothership`).HandleBulkMailUnsubscribe(e))
routerAdd('POST', '/api/bulkmail/feedback/webhook', (e) => require(`${__hooks}/mothership`).HandleBulkMailWebhook(e))

cronAdd('bulkmail-sender', '* * * * *', () => {
  require(`${__hooks}/mothership`).runBulkMailSender()
})

onRecordAfterUpdateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).syncUserToSuppressions(e)
}, 'users')

onRecordAfterCreateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).syncSuppressionToUser(e, true)
}, '_bulkmail_suppressions')

onRecordAfterUpdateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).syncSuppressionToUser(e, true)
}, '_bulkmail_suppressions')

onRecordAfterDeleteSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).syncSuppressionToUser(e, false)
}, '_bulkmail_suppressions')
