type Logger = (...args: any[]) => void

type StringKvLookup = { [_: string]: string }

type AuditEvents =
  | 'ERROR'
  | 'NOTIFICATION_ERR'
  | 'LS'
  | 'LS_ERR'
  | 'PBOUNCE'
  | 'PBOUNCE_ERR'
  | 'SNS_ERR'
  | 'COMPLAINT'
  | 'COMPLAINT_ERR'
  | 'UNSUBSCRIBE'
  | 'UNSUBSCRIBE_ERR'

interface Lib {
  mkLog: (namespace: string) => Logger
  processNotification: (
    notificationRec: models.Record,
    context: { log: Logger; test?: boolean; dao: daos.Dao },
  ) => void
  enqueueNotification: (
    channel: 'email' | 'lemonbot',
    template:
      | 'maintenance-mode'
      | 'lemon_order_email'
      | 'lemon_order_discord'
      | 'welcome',
    user_id: string,
    context: {
      message_template_vars?: { [_: string]: string }
      dao: daos.Dao
      log: Logger
    },
  ) => void

  audit: (
    event: AuditEvents,
    note: string,
    context: {
      log: Logger

      dao: daos.Dao
      extra?: Partial<{
        notification: string
        email: string
        user: string
        raw_payload: string
      }>
    },
  ) => void
  removeEmptyKeys: <T>(obj: T) => T
  versions: string[]
}
