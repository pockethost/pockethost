/// <reference path="../types/types.d.ts" />

routerAdd('POST', '/api/sns', (c) => {
  const log = (...s) =>
    console.log(
      `*** [sns]`,
      ...s.map((p) => {
        if (typeof p === 'object') return JSON.stringify(p, null, 2)
        return p
      }),
    )
  const error = (...s) => console.error(`***`, ...s)

  const audit = (key, note) => {
    log(note)
    const collection = $app.dao().findCollectionByNameOrId('audit')

    const record = new Record(collection, {
      ...key,
      note,
    })

    $app.dao().saveRecord(record)
  }

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
        audit(
          { user: user.getId(), event: `PBOUNCE_ERR` },
          `User ${emailAddress} could not be disabled `,
        )
      }
      audit(
        { user: user.getId(), event: `PBOUNCE` },
        `User ${emailAddress} has been disabled`,
      )
    } catch (e) {
      audit(
        { email: emailAddress, event: `PBOUNCE_ERR` },
        `${emailAddress} is not in the system.`,
      )
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
              audit(
                { event: `SNS` },
                `Unrecognized bounce type ${bounceType}: ${data}`,
              )
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
                  { user: user.getId(), event: `COMPLAINT` },
                  `User ${emailAddress} has been unsubscribed`,
                )
              } catch (e) {
                audit(
                  { email: emailAddress, event: `COMPLAINT` },
                  `${emailAddress} is not in the system.`,
                )
              }
            })
          }
          break
        default:
          audit(
            { event: `SNS` },
            `Unrecognized notification type ${notificationType}: ${data}`,
          )
      }
      break
    default:
      audit({ event: `SNS` }, `Message ${Type} not handled: ${data}`)
  }

  return c.json(200, { status: 'ok' })
})
