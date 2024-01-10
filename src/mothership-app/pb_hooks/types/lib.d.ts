type Logger = (...args: any[]) => void

type StringKvLookup = { [_: string]: string }

type AuditEvents =
  | 'NOTIFICATION_ERR'
  | 'LS'
  | 'LS_ERR'
  | 'PBOUNCE_ERR'
  | 'PBOUNCE'
  | 'SNS'
  | 'COMPLAINT'
  | 'UNSUBSCRIBE'
  | 'UNSUBSCRIBE_ERR'

interface Lib {
  mkLog: (namespace: string) => Logger
  processNotification: (
    notificationRec: models.Record,
    context: { log: Logger; test: boolean },
  ) => void
  enqueueNotification: (
    channel: 'email' | 'lemonbot',
    template:
      | 'maintenance_mode'
      | 'lemon_order_email'
      | 'lemon_order_discord'
    user_id: string,
    message_template_vars?: { [_: string]: string },
    dao?: daos.Dao,
  ) => void

  audit: (
    event: AuditEvents,
    note: string,
    extra?: Partial<{
      notification: string
      email: string
      user: string
      raw_payload: string
    }>,
  ) => void
  removeEmptyKeys: <T>(obj: T) => T
}
