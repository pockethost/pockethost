/// <reference path="../types/types.d.ts" />

routerAdd('GET', '/api/unsubscribe', (c) => {
  const log = (...s) =>
    console.log(
      `*** [unsubscribe]`,
      ...s.map((p) => {
        if (typeof p === 'object') return JSON.stringify(p, null, 2)
        return p
      }),
    )
  const error = (...s) => console.error(`***`, ...s)

  const audit = (key, note) => {
    log(note)
    const email = new MailerMessage({
      from: {
        address: $app.settings().meta.senderAddress,
        name: $app.settings().meta.senderName,
      },
      to: [{ address: `ben@benallfree.com` }],
      subject: JSON.stringify(key),
      html: JSON.stringify(key),
    })

    $app.newMailClient().send(email)

    const collection = $app.dao().findCollectionByNameOrId('audit')

    const record = new Record(collection, {
      ...key,
      note,
    })

    $app.dao().saveRecord(record)
  }

  const id = c.queryParam('e')

  try {
    const record = $app.dao().findRecordById('users', id)
    record.set(`unsubscribe`, true)
    $app.dao().saveRecord(record)

    const email = record.getString('email')
    audit({ email, user: id, event: `UNSUBSCRIBE` }, ``)
    return c.html(200, `<p>${email} has been unsubscribed.`)
  } catch (e) {
    audit({ email, event: `UNSUBSCRIBE_ERR` }, ``)
    return c.html(200, `<p>Looks like you're already unsubscribed.`)
  }
})
