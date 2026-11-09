routerAdd(`GET`, `api/process_single_notification`, (e) => {
  return require(`${__hooks}/mothership`).HandleProcessSingleNotification(e)
})

onRecordAfterCreateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).HandleProcessNotification(e)
}, `notifications`)

onRecordUpdate((e) => {
  e.next()
  require(`${__hooks}/mothership`).HandleUserWelcomeMessage(e)
}, 'users')
