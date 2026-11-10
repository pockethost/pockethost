/**
 * Only superusers move an instance to another edge (and so another region) through the records API; customers' instance
 * updates never touch `edge`. Moving an instance does not move its data: it stays on the old edge's disk.
 */
export const BeforeUpdateRequest_edge = (e: core.RecordRequestEvent) => {
  const record = e.record
  if (!record || e.hasSuperuserAuth()) return
  if (record.getString('edge') !== record.original().getString('edge')) {
    throw new ForbiddenError(`Only a superuser can move an instance to another edge.`)
  }
}
