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
  mkNotificationProcessor: (
    log: Logger,
    dao: daos.Dao,
    test?: boolean,
  ) => (notificationRec: models.Record) => void
  mkNotifier: (
    log: Logger,
    dao: daos.dao,
  ) => (
    channel: 'email' | 'lemonbot',
    template:
      | 'maintenance-mode'
      | 'lemon_order_email'
      | 'lemon_order_discord'
      | 'welcome',
    user_id: string,
    context: { [_: string]: any },
  ) => void
  mkAudit: (
    log: Logger,
    dao: daos.Dao,
  ) => (event: AuditEvents, note: string, context: { [_: string]: any }) => void
  removeEmptyKeys: <T>(obj: T) => T
  versions: string[]
}
