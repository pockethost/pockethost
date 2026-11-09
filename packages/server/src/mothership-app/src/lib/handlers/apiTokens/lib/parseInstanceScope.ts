/**
 * Validates `{ all_instances, instances }` from a token create/update body. Every listed instance must exist and be
 * owned by `userId`; at least one is required unless `all_instances` is true.
 */
export const parseInstanceScope = (
  body: Record<string, unknown>,
  userId: string
): { allInstances: boolean; instanceIds: string[] } => {
  const allInstances = body.all_instances === true
  const instanceIds = Array.isArray(body.instances)
    ? [...new Set(body.instances.filter((v): v is string => typeof v === 'string'))]
    : []
  if (!allInstances && instanceIds.length === 0) {
    throw new BadRequestError('Select at least one instance or choose all instances.')
  }
  if (allInstances) return { allInstances, instanceIds: [] }
  for (const id of instanceIds) {
    let instance: core.Record
    try {
      instance = $app.findRecordById('instances', id)
    } catch {
      throw new BadRequestError('One or more selected instances were not found.')
    }
    if (instance.getString('uid') !== userId) {
      throw new BadRequestError('One or more selected instances are not owned by you.')
    }
  }
  return { allInstances, instanceIds }
}
