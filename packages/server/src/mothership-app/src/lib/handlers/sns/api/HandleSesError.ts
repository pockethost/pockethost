import { mkLog } from '$util/Logger'
import { suppressUserEmail } from '$util/mailRecipient'
import { mkAudit } from '$util/mkAudit'

type SnsSubscriptionConfirmationEvent = {
  Type: 'SubscriptionConfirmation'
  SubscribeURL: string
}

type SnsNotificationEvent = {
  Type: 'Notification'
  Message: string
}

type SnsEnvelopeEvent = SnsSubscriptionConfirmationEvent | SnsNotificationEvent

type SesEnvelope = {
  notificationType?: string
  eventType?: string
  bounce?: {
    bounceType: string
    bouncedRecipients: { emailAddress: string }[]
  }
  complaint?: {
    complainedRecipients: { emailAddress: string }[]
  }
}

function isSnsSubscriptionConfirmationEvent(event: SnsEnvelopeEvent): event is SnsSubscriptionConfirmationEvent {
  return event.Type === 'SubscriptionConfirmation'
}

function isSnsNotificationEvent(event: SnsEnvelopeEvent): event is SnsNotificationEvent {
  return event.Type === 'Notification'
}

function sesEventType(msg: SesEnvelope): string {
  return String(msg.notificationType ?? msg.eventType ?? '')
}

export const HandleSesError = (e: core.RequestEvent) => {
  const log = mkLog(`sns`)
  const audit = mkAudit(log, $app)

  const processBounce = (emailAddress: string) => {
    log(`Processing bounce ${emailAddress}`)
    const extra = {
      email: emailAddress,
    } as { email: string; user?: string }
    try {
      const user = $app.findFirstRecordByData('users', 'email', emailAddress)
      log(`user is`, user)
      extra.user = user.id
      suppressUserEmail(user)
      $app.save(user)
      audit('PBOUNCE', `User ${emailAddress} has been disabled`, extra)
    } catch (e) {
      audit('PBOUNCE_ERR', `${e}`, extra)
    }
  }

  const processComplaint = (emailAddress: string) => {
    log(`Processing complaint ${emailAddress}`)
    const extra = {
      email: emailAddress,
    } as { email: string; user?: string }
    try {
      const user = $app.findFirstRecordByData('users', 'email', emailAddress)
      log(`user is`, user)
      extra.user = user.id
      suppressUserEmail(user)
      $app.save(user)
      audit('COMPLAINT', `User ${emailAddress} has been unsubscribed`, extra)
    } catch (e) {
      audit('COMPLAINT_ERR', `${emailAddress} is not in the system.`, extra)
    }
  }

  const raw = readerToString(e.request.body)
  const data = JSON.parse(raw) as SnsEnvelopeEvent
  log(JSON.stringify(data, null, 2))

  if (isSnsSubscriptionConfirmationEvent(data)) {
    const url = data.SubscribeURL
    log(url)
    $http.send({ url })
    return e.json(200, { status: 'ok' })
  }

  if (!isSnsNotificationEvent(data)) {
    audit('SNS_ERR', `Unrecognized SNS envelope type ${(data as { Type?: string }).Type}`, { raw })
    return e.json(200, { status: 'ok' })
  }

  const msg = JSON.parse(data.Message) as SesEnvelope
  log(msg)

  const eventType = sesEventType(msg)
  if (eventType === 'Bounce') {
    log(`Message is a bounce`)
    const bounce = msg.bounce
    if (!bounce) {
      audit('SNS_ERR', 'Bounce event missing bounce object', { raw })
      return e.json(200, { status: 'ok' })
    }
    const { bounceType, bouncedRecipients } = bounce
    if (bounceType === `Permanent`) {
      log(`Message is a permanent bounce`)
      bouncedRecipients.forEach((recipient) => {
        processBounce(recipient.emailAddress)
      })
    } else {
      audit('SNS_ERR', `Unrecognized bounce type ${bounceType}`, { raw })
    }
    return e.json(200, { status: 'ok' })
  }

  if (eventType === 'Complaint') {
    log(`Message is a Complaint`, msg)
    const complaint = msg.complaint
    if (!complaint) {
      audit('SNS_ERR', 'Complaint event missing complaint object', { raw })
      return e.json(200, { status: 'ok' })
    }
    complaint.complainedRecipients.forEach((recipient) => {
      processComplaint(recipient.emailAddress)
    })
    return e.json(200, { status: 'ok' })
  }

  audit('SNS_ERR', `Unrecognized SES event type ${eventType}`, { raw })
  return e.json(200, { status: 'ok' })
}
