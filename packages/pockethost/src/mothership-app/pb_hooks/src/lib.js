/// <reference types="../types/lib.d.ts" />

/** @type {Lib['mkAudit']} */
const mkAudit = (log, dao) => {
  return (event, note, context) => {
    log(`top of audit`)
    log(`AUDIT:${event}: ${note}`, JSON.stringify({ context }, null, 2))
    dao.saveRecord(
      new Record(dao.findCollectionByNameOrId('audit'), {
        event,
        note,
        context,
      }),
    )
  }
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

/** @type {Lib['mkNotifier']} */
const mkNotifier =
  (log, dao) =>
  (channel, template, user_id, context = {}) => {
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
        message_template_vars: context,
      },
    )
    log(`built notification record`, emailNotification)
    dao.saveRecord(emailNotification)
  }

/** @type {Lib['mkNotificationProcessor']} */
const mkNotificationProcessor =
  (log, dao, test = false) =>
  (notificationRec) => {
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
          bcc: [process.env.TEST_EMAIL]
            .filter((e) => !!e)
            .map((e) => ({ address: e })),
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
        const params = {
          url: test
            ? process.env.DISCORD_TEST_CHANNEL_URL
            : process.env.DISCORD_STREAM_CHANNEL_URL,
          method: 'POST',
          body: JSON.stringify({
            content: subject,
          }),
          headers: { 'content-type': 'application/json' },
          timeout: 5, // in seconds
        }
        log(`sending discord message`, params)
        const res = $http.send(params)
        log(`discord sent`, res)
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

/** @type {Lib['versions']} */
const versions = require(`${__hooks}/versions.cjs`)

module.exports = {
  mkAudit,
  mkNotificationProcessor,
  mkLog,
  mkNotifier,
  removeEmptyKeys,
  versions,
}
