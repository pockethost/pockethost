import { Logger, interpolateString } from './Logger'

export const mkNotificationProcessor =
  (log: Logger, dao: CoreApp, test = false) =>
    (notificationRec: core.Model) => {
      log({ notificationRec })

      const channel = notificationRec.getString(`channel`)
      dao.expandRecord(notificationRec, ['message_template', 'user'])

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
      const subject = interpolateString(messageTemplateRec.getString(`subject`), vars)
      const html = interpolateString(messageTemplateRec.getString(`body_html`), vars)

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
          const url = test ? process.env.DISCORD_TEST_CHANNEL_URL : process.env.DISCORD_STREAM_CHANNEL_URL
          if (url) {
            const params: {
              body?: string | FormData;
              data?: {
                [key: string]: any;
              };
              headers?: {
                [key: string]: string;
              };
              method?: string;
              timeout?: number;
              url: string;
            } = {
              url,
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
          }

          break
        default:
          throw new Error(`Unsupported channel: ${channel}`)
      }
      if (!test) {
        notificationRec.set(`delivered`, new DateTime())
        dao.save(notificationRec)
      }
    }
