import { mkLog } from '$util/Logger'

const log = mkLog(`bonus-instances`)

/** Recomputes `users.bonus_instances` from the user's `bonus_grants` (sum, floored at 0). */
export const recomputeBonusInstances = (uid: string) => {
  if (!uid) return
  const row = new DynamicModel({ total: 0 })
  $app
    .db()
    .newQuery(`SELECT COALESCE(SUM(amount), 0) AS total FROM bonus_grants WHERE user = {:uid}`)
    .bind({ uid })
    .one(row)
  const total = Math.max(0, Math.floor(Number(row.total) || 0))
  let user: core.Record
  try {
    user = $app.findRecordById('users', uid)
  } catch {
    return // user deleted (its grants cascade)
  }
  if (user.getInt('bonus_instances') === total) return
  user.set('bonus_instances', total)
  $app.save(user)
  log(`${uid}: bonus_instances = ${total}`)
}

/** After a grant is created, updated or deleted: recompute its user (and the previous user if it moved). */
export const AfterChange_bonusGrant = (e: core.RecordEvent) => {
  const uid = e.record?.getString('user') ?? ''
  recomputeBonusInstances(uid)
  const before = e.record?.original()?.getString('user') ?? ''
  if (before && before !== uid) recomputeBonusInstances(before)
}

/**
 * Only superusers (and the grants hook) change bonus_instances. Production's users collection has no update rule, so
 * customers can't update their record at all; this guard keeps it that way even if that rule ever opens up.
 */
export const BeforeUpdateRequest_guardBonusInstances = (e: core.RecordRequestEvent) => {
  if (e.hasSuperuserAuth() || !e.record) return
  const stored = $app.findRecordById('users', e.record.id).getInt('bonus_instances')
  if (e.record.getInt('bonus_instances') !== stored) e.record.set('bonus_instances', stored)
}
