routerAdd(
  'POST',
  '/api/mail',
  (c) => {
    return require(`${__hooks}/mothership`).HandleMailSend(c)
  },
  $apis.requireAdminAuth()
)
