import { Logger } from './Logger'

export const mkNotifier =
  (log: Logger, dao: daos.Dao) =>
  <TContext extends Record<string, any>>(
    channel: 'email' | 'lemonbot',
    template: string,
    user_id: string,
    context: TContext = {} as TContext
  ) => {
    log({ channel, template, user_id })
    const emailTemplate = dao.findFirstRecordByData('message_templates', `slug`, template)
    log(`got email template`, emailTemplate)
    if (!emailTemplate) throw new Error(`Template ${template} not found`)
    const emailNotification = new Record(dao.findCollectionByNameOrId('notifications'), {
      user: user_id,
      channel,
      message_template: emailTemplate.getId(),
      message_template_vars: context,
    })
    log(`built notification record`, emailNotification)
    dao.saveRecord(emailNotification)
  }
