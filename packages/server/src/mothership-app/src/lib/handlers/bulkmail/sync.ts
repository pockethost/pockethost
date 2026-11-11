/**
 * Users.unsubscribe <-> _bulkmail_suppressions, both ways. The dashboard, Node and older mothership code read
 * users.unsubscribe; the CE bulk mail schema reads the suppression list. Each side only writes when the other side
 * differs, so the two hooks settle after one round.
 */
import { normalizeEmail } from '$util/bulkmail/template'
import { BM_SUPPRESSIONS, suppress } from './engine'

export const syncUserToSuppressions = (e: core.RecordEvent) => {
  const user = e.record
  if (!user) return
  const before = user.original().getBool('unsubscribe')
  const after = user.getBool('unsubscribe')
  if (before === after) return
  const email = normalizeEmail(user.email())
  if (!email) return
  let existing: core.Record | null = null
  try {
    existing = e.app.findFirstRecordByData(BM_SUPPRESSIONS, 'email', email)
  } catch (_e) {}
  if (after && !existing) {
    suppress(email, 'unsubscribed', 'users.unsubscribe', '', e.app as any)
  } else if (!after && existing) {
    e.app.delete(existing)
  }
}

const findUser = (app: core.App, email: string) => {
  try {
    return app.findFirstRecordByData('users', 'email', email)
  } catch (_e) {
    // emails are stored as typed; fall back to a case-insensitive match
    try {
      return app.findFirstRecordByFilter('users', 'email:lower = {:e}', { e: email })
    } catch (_e2) {
      return null
    }
  }
}

export const syncSuppressionToUser = (e: core.RecordEvent, suppressed: boolean) => {
  const email = normalizeEmail(e.record?.getString('email') || '')
  if (!email) return
  const user = findUser(e.app, email)
  if (!user || user.getBool('unsubscribe') === suppressed) return
  user.set('unsubscribe', suppressed)
  e.app.save(user)
}
