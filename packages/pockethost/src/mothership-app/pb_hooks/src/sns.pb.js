/// <reference path="../types/types.d.ts" />

routerAdd('POST', '/api/sns', (c) => {
  const dao = $app.dao()
  const { mkLog, mkAudit } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))
  const log = mkLog(`sns`)
  const audit = mkAudit(log, dao)

  const processBounce = (emailAddress) => {
    log(`Processing ${emailAddress}`)
    const extra = /** @type {{ email: string; user: string }} */ ({
      email: emailAddress,
    })
    try {
      const user = dao.findFirstRecordByData('users', 'email', emailAddress)
      log(`user is`, user)
      extra.user = user.getId()
      user.setVerified(false)
      dao.saveRecord(user)
      audit('PBOUNCE', `User ${emailAddress} has been disabled`, extra)
    } catch (e) {
      audit('PBOUNCE_ERR', `${e}`, extra)
    }
  }

  ;[].forEach(processBounce)

  const raw = readerToString(c.request().body)
  const data = JSON.parse(raw)
  log(JSON.stringify(data, null, 2))

  const { Type } = data

  switch (Type) {
    case `SubscriptionConfirmation`:
      const url = data.SubscribeURL
      log(url)
      $http.send({ url })
      return c.json(200, { status: 'ok' })

    case `Notification`:
      const msg = JSON.parse(data.Message)
      log(msg)
      const { notificationType } = msg
      switch (notificationType) {
        case `Bounce`: {
          log(`Message is a bounce`)
          const { bounce } = msg
          const { bounceType } = bounce
          switch (bounceType) {
            case `Permanent`:
              log(`Message is a permanent bounce`)
              const { bouncedRecipients } = bounce
              bouncedRecipients.forEach((recipient) => {
                const { emailAddress } = recipient
                processBounce(emailAddress)
              })
              break
            default:
              audit('SNS_ERR', `Unrecognized bounce type ${bounceType}`, {
                raw,
              })
          }
          break
        }
        case `Complaint`:
          {
            log(`Message is a Complaint`, msg)
            const { complaint } = msg
            const { complainedRecipients } = complaint
            complainedRecipients.forEach((recipient) => {
              const { emailAddress } = recipient
              log(`Processing ${emailAddress}`)
              try {
                const user = $app
                  .dao()
                  .findFirstRecordByData('users', 'email', emailAddress)
                log(`user is`, user)
                user.set(`unsubscribe`, true)
                dao.saveRecord(user)
                audit(
                  'COMPLAINT',
                  `User ${emailAddress} has been unsubscribed`,
                  { emailAddress, user: user.getId() },
                )
              } catch (e) {
                audit(
                  'COMPLAINT_ERR',
                  `${emailAddress} is not in the system.`,
                  {
                    emailAddress,
                  },
                )
              }
            })
          }
          break
        default:
          audit(
            'SNS_ERR',
            `Unrecognized notification type ${notificationType}`,
            { raw },
          )
      }
      break
    default:
      audit(`SNS_ERR`, `Message ${Type} not handled`, {
        raw,
      })
  }

  return c.json(200, { status: 'ok' })
})
