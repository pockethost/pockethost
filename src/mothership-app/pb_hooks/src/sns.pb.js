/// <reference path="../types/types.d.ts" />

routerAdd('POST', '/api/sns', (c) => {
  const { mkLog, audit } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))
  const log = mkLog(`sns`)

  const processBounce = (emailAddress) => {
    log(`Processing ${emailAddress}`)
    try {
      const user = $app
        .dao()
        .findFirstRecordByData('users', 'email', emailAddress)
      log(`user is`, user)
      user.setVerified(false)
      try {
        $app.dao().saveRecord(user)
      } catch (e) {
        audit(`PBOUNCE_ERR`, `User ${emailAddress} could not be disabled `, {
          user: user.getId(),
        })
      }
      audit('PBOUNCE', `User ${emailAddress} has been disabled`, {
        user: user.getId(),
      })
    } catch (e) {
      audit('PBOUNCE_ERR', `${emailAddress} is not in the system.`, {
        email: emailAddress,
      })
      log(`After audit`)
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
              audit('SNS', `Unrecognized bounce type ${bounceType}`, {
                raw_payload: raw,
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
                $app.dao().saveRecord(user)
                audit(
                  'COMPLAINT',
                  `User ${emailAddress} has been unsubscribed`,
                  { email: emailAddress, user: user.getId() },
                )
              } catch (e) {
                audit('COMPLAINT', `${emailAddress} is not in the system.`, {
                  email: emailAddress,
                })
              }
            })
          }
          break
        default:
          audit('SNS', `Unrecognized notification type ${notificationType}`, {
            raw_payload: raw,
          })
      }
      break
    default:
      audit(`SNS`, `Message ${Type} not handled`, { raw_payload: raw })
  }

  return c.json(200, { status: 'ok' })
})
