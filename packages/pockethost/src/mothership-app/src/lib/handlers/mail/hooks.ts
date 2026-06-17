routerAdd(
  'POST',
  '/api/mail',
  (e) => {
    return require(`${__hooks}/mothership`).HandleMailSend(e)
  },
  $apis.requireSuperuserAuth()
)
