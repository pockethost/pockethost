routerAdd(`GET`, `api/process_single_notification`, (c) => {
  return require(`${__hooks}/mothership`).HandleProcessSingleNotification(c)
})

onRecordAfterCreateSuccess((e) => {
  return require(`${__hooks}/mothership`).HandleProcessNotification(e)
}, `notifications`)

onRecordUpdate((e) => {
  return require(`${__hooks}/mothership`).HandleUserWelcomeMessage(e)
}, 'users')
