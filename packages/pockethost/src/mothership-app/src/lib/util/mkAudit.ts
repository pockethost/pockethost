import { Logger } from './Logger'

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

export const mkAudit = (
  log: Logger,
  dao: CoreApp
): ((event: AuditEvents, note: string, context?: { [_: string]: any }) => void) => {
  return (event, note, context) => {
    log(`top of audit`)
    log(`AUDIT:${event}: ${note}`, JSON.stringify({ context }, null, 2))
    dao.save(
      new Record(dao.findCollectionByNameOrId('audit'), {
        event,
        note,
        context,
      })
    )
  }
}
