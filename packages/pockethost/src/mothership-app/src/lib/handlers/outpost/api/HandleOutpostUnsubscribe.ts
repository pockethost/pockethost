import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'

export const HandleOutpostUnsubscribe = (c: core.RequestEvent) => {
  const dao = $app
  const log = mkLog(`unsubscribe`)
  const audit = mkAudit(log, dao)

  const id = c.request?.url?.query().get('e')

  if (!id) {
    return c.html(400, `<p>Invalid unsubscribe link.</p>`)
  }

  try {
    const record = dao.findRecordById('users', id)
    record.set(`unsubscribe`, true)
    dao.save(record)

    const email = record.getString('email')
    audit('UNSUBSCRIBE', '', { email, user: id })

    $app.newMailClient().send(
      new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName,
        },
        to: [{ address: `ben@benallfree.com` }],
        subject: `UNSUBSCRIBE ${email}`,
      })
    )
    return c.html(200, `<p>${email} has been unsubscribed.`)
  } catch (e) {
    audit('UNSUBSCRIBE_ERR', `User ${id} not found`)
    return c.html(200, `<p>Looks like you're already unsubscribed.`)
  }
}
