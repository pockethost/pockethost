/// <reference path="../types/types.d.ts" />

routerAdd('GET', '/api/unsubscribe', (c) => {
  const dao = $app.dao()
  const { mkLog, audit } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))
  const log = mkLog(`unsubscribe`)

  const id = c.queryParam('e')

  try {
    const record = dao.findRecordById('users', id)
    record.set(`unsubscribe`, true)
    dao.saveRecord(record)

    const email = record.getString('email')
    audit('UNSUBSCRIBE', '', { dao, log, extra: { email, user: id } })

    $app.newMailClient().send(
      new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName,
        },
        to: [{ address: `ben@benallfree.com` }],
        subject: `UNSUBSCRIBE ${email}`,
      }),
    )
    return c.html(200, `<p>${email} has been unsubscribed.`)
  } catch (e) {
    audit('UNSUBSCRIBE_ERR', `User ${id} not found`, { dao, log })
    return c.html(200, `<p>Looks like you're already unsubscribed.`)
  }
})
