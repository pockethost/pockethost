routerAdd(`GET`, `api/process_single_notification`, (c) => {
  return require(`${__hooks}/mothership`).HandleProcessSingleNotification(c)
})

onModelAfterCreate((e) => {
  return require(`${__hooks}/mothership`).HandleProcessNotification(e)
}, `notifications`)

onModelBeforeUpdate((e) => {
  return require(`${__hooks}/mothership`).HandleUserWelcomeMessage(e)
}, 'users')
