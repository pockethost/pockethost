import { Logger } from './Logger'

export const mkNotifier =
  (log: Logger, app: core.App) =>
  <TContext extends Record<string, any>>(
    channel: 'email' | 'lemonbot',
    template: string,
    user_id: string,
    context: TContext = {} as TContext
  ) => {
    log({ channel, template, user_id })
    const emailTemplate = app.findFirstRecordByData('message_templates', `slug`, template)
    log(`got email template`, emailTemplate)
    if (!emailTemplate) throw new Error(`Template ${template} not found`)
    const emailNotification = new Record(app.findCollectionByNameOrId('notifications'), {
      user: user_id,
      channel,
      message_template: emailTemplate.id,
      message_template_vars: context,
    })
    log(`built notification record`, emailNotification)
    app.save(emailNotification)
  }
