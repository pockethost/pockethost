import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'

type SnsSubscriptionConfirmationEvent = {
  Type: 'SubscriptionConfirmation'
  SubscribeURL: string
}

type SnsNotificationEvent = {
  Type: 'Notification'
  Message: string
}

type SnsNotificationBouncePayload = {
  notificationType: 'Bounce'
  bounce: {
    bounceType: 'Permanent'
    bouncedRecipients: { emailAddress: string }[]
  }
}

type SnsNotificationComplaintPayload = {
  notificationType: 'Complaint'
  complaint: {
    complainedRecipients: { emailAddress: string }[]
  }
}

type SnsNotificationPayload = SnsNotificationBouncePayload | SnsNotificationComplaintPayload

type SnsEvent = SnsSubscriptionConfirmationEvent | SnsNotificationEvent

function isSnsSubscriptionConfirmationEvent(event: SnsEvent): event is SnsSubscriptionConfirmationEvent {
  return event.Type === 'SubscriptionConfirmation'
}

function isSnsNotificationEvent(event: SnsEvent): event is SnsNotificationEvent {
  return event.Type === 'Notification'
}

function isSnsNotificationBouncePayload(payload: SnsNotificationPayload): payload is SnsNotificationBouncePayload {
  return payload.notificationType === 'Bounce'
}

function isSnsNotificationComplaintPayload(
  payload: SnsNotificationPayload
): payload is SnsNotificationComplaintPayload {
  return payload.notificationType === 'Complaint'
}

export const HandleSesError = (c: echo.Context) => {
  const dao = $app.dao()
  const log = mkLog(`sns`)
  const audit = mkAudit(log, dao)

  const processBounce = (emailAddress: string) => {
    log(`Processing ${emailAddress}`)
    const extra = {
      email: emailAddress,
    } as { email: string; user: string }
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

  const raw = readerToString(c.request().body)
  const data = JSON.parse(raw) as SnsEvent
  log(JSON.stringify(data, null, 2))

  if (isSnsSubscriptionConfirmationEvent(data)) {
    const url = data.SubscribeURL
    log(url)
    $http.send({ url })
    return c.json(200, { status: 'ok' })
  }

  if (isSnsNotificationEvent(data)) {
    const msg = JSON.parse(data.Message) as SnsNotificationPayload
    log(msg)

    if (isSnsNotificationBouncePayload(msg)) {
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
    } else if (isSnsNotificationComplaintPayload(msg)) {
      log(`Message is a Complaint`, msg)
      const { complaint } = msg
      const { complainedRecipients } = complaint
      complainedRecipients.forEach((recipient) => {
        const { emailAddress } = recipient
        log(`Processing ${emailAddress}`)
        try {
          const user = $app.dao().findFirstRecordByData('users', 'email', emailAddress)
          log(`user is`, user)
          user.set(`unsubscribe`, true)
          dao.saveRecord(user)
          audit('COMPLAINT', `User ${emailAddress} has been unsubscribed`, {
            emailAddress,
            user: user.getId(),
          })
        } catch (e) {
          audit('COMPLAINT_ERR', `${emailAddress} is not in the system.`, {
            emailAddress,
          })
        }
      })
    } else {
      audit('SNS_ERR', `Unrecognized notification type ${data.Type}`, {
        raw,
      })
    }
  }
  audit(`SNS_ERR`, `Message ${data.Type} not handled`, {
    raw,
  })

  return c.json(200, { status: 'ok' })
}
