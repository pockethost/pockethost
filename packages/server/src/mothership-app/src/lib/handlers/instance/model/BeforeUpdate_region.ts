/** A region is chosen once, at creation. It never changes afterwards (moves between edges keep the region). */
export const BeforeUpdate_region = (e: core.RecordEvent) => {
  const record = e.record
  if (!record) return
  const before = String(record.original().get('region') || '')
  const after = String(record.get('region') || '')
  if (before && after !== before) {
    throw new BadRequestError(`An instance's region can't be changed after it is created.`)
  }
}
