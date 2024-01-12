/** @type {Lib['audit']} */
const audit = (event, note, { log, dao, extra = {} }) => {
  log(`AUDIT:${event}: ${note}`, extra)
  dao.saveRecord(
    new Record(dao.findCollectionByNameOrId('audit'), {
      event,
      note,
      ...extra,
    }),
  )
}

/** @type {Lib['mkLog']} */
const mkLog =
  (namespace) =>
  /**
   * @param {...any} s
   * @returns
   */
  (...s) =>
    console.log(
      `[${namespace}]`,
      ...s.map((p) => {
        if (typeof p === 'object') return JSON.stringify(p, null, 2)
        return p
      }),
    )

/**
 * @param {...any} args
 * @returns
 */
const dbg = (...args) => console.log(args)

/**
 * @param {string} template
 * @param {{ [_: string]: string }} dict
 * @returns
 */
function interpolateString(template, dict) {
  return template.replace(/\{\$(\w+)\}/g, (match, key) => {
    dbg({ match, key })
    const lowerKey = key.toLowerCase()
    return dict.hasOwnProperty(lowerKey) ? dict[lowerKey] || '' : match
  })
}

/** @type {Lib['enqueueNotification']} */
const enqueueNotification = (
  channel,
  template,
  user_id,
  { log, dao, message_template_vars = {} },
) => {
  log({ channel, template, user_id })
  const emailTemplate = dao.findFirstRecordByData(
    'message_templates',
    `slug`,
    template,
  )
  log(`got email template`, emailTemplate)
  if (!emailTemplate) throw new Error(`Template ${template} not found`)
  const emailNotification = new Record(
    dao.findCollectionByNameOrId('notifications'),
    {
      user: user_id,
      channel,
      message_template: emailTemplate.getId(),
      message_template_vars,
    },
  )
  log(`built notification record`, emailNotification)
  dao.saveRecord(emailNotification)
}

/** @type {Lib['processNotification']} */
const processNotification = (notificationRec, { log, dao, test = false }) => {
  log({ notificationRec })

  const channel = notificationRec.getString(`channel`)
  dao.expandRecord(notificationRec, ['message_template', 'user'], null)

  const messageTemplateRec = notificationRec.expandedOne('message_template')
  if (!messageTemplateRec) {
    throw new Error(`Missing message template`)
  }
  const userRec = notificationRec.expandedOne('user')
  if (!userRec) {
    throw new Error(`Missing user record`)
  }
  const vars = JSON.parse(notificationRec.getString(`message_template_vars`))
  const to = userRec.email()
  const subject = interpolateString(
    messageTemplateRec.getString(`subject`),
    vars,
  )
  const html = interpolateString(
    messageTemplateRec.getString(`body_html`),
    vars,
  )

  log({ channel, messageTemplateRec, userRec, vars, to, subject, html })
  switch (channel) {
    case `email`:
      /** @type {Partial<mailer.Message_In>} */
      const msgArgs = {
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName,
        },
        to: [{ address: to }],
        bcc: [{ address: `pockethost+notifications@benallfree.com` }],
        subject,
        html,
      }
      if (test) {
        msgArgs.to = [{ address: `ben@benallfree.com` }]
        msgArgs.subject = `***TEST ${to} *** ${msgArgs.subject}`
      }
      log({ msgArgs })
      // @ts-ignore
      const msg = new MailerMessage(msgArgs)
      $app.newMailClient().send(msg)
      log(`email sent`)
      break

    case `lemonbot`:
      const res = $http.send({
        url: test
          ? `https://discord.com/api/webhooks/1194056858516869213/pwT-ymSxiPmLN5-M2a7FsesvrbtdmwUsKXWIKqebROJEfyP0E3-aSseUjDg4ojBkWV4D` // Test channel
          : `https://discord.com/api/webhooks/1193619183594901575/JVDfdUz2HPEUk-nG1RfI3BK2Czyx5vw1YmeH7cNfgvXbHNGPH0oJncOYqxMA_u5b2u57`, // Stream channel
        method: 'POST',
        body: JSON.stringify({
          content: subject,
        }),
        headers: { 'content-type': 'application/json' },
        timeout: 5, // in seconds
      })
      log(`discord sent`)
      break
    default:
      throw new Error(`Unsupported channel: ${channel}`)
  }
  if (!test) {
    notificationRec.set(`delivered`, new DateTime())
    dao.saveRecord(notificationRec)
  }
}

/**
 * @template T
 * @param {T} obj
 * @returns T
 */
function removeEmptyKeys(obj) {
  const sanitized = Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value
    }
    return acc
  }, /** @type {T} */ ({}))
  return sanitized
}

module.exports = {
  audit,
  processNotification,
  mkLog,
  enqueueNotification,
  removeEmptyKeys,
}
