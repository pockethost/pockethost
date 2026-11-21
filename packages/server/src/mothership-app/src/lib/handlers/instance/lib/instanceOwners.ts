/**
 * Who owns an instance, and whether their login is synced into it as a superuser: the `instance_owners` table (one row
 * per owned instance; was `instances.uid` / `instances.syncAdmin`). The mothership's Go resolves what the instance gets
 * from its owner from these rows (blocked, superusers, trusted IPs, owners).
 */

/** The instance's owner row, or undefined when it has none. */
export const findOwnerRow = (app: core.App, instanceId: string): core.Record | undefined => {
  try {
    return app.findFirstRecordByFilter('instance_owners', 'instance = {:id}', { id: instanceId }) ?? undefined
  } catch {
    return undefined
  }
}

/** The owner's user id, or '' when the instance has no owner. */
export const ownerOf = (app: core.App, instanceId: string): string =>
  findOwnerRow(app, instanceId)?.getString('user') ?? ''

/** Whether the owner's login is synced into the instance as a superuser. */
export const syncLoginOf = (app: core.App, instanceId: string): boolean =>
  findOwnerRow(app, instanceId)?.getBool('sync_login') ?? false

/** Every instance the user owns. */
export const ownedInstances = (app: core.App, userId: string): core.Record[] =>
  app
    .findRecordsByFilter('instances', 'instance_owners_via_instance.user ?= {:uid}', '', 0, 0, { uid: userId })
    .filter((r): r is core.Record => !!r)

/** Makes userId the owner of a new instance. Call in the transaction that saved the instance. */
export const addOwner = (app: core.App, instanceId: string, userId: string, syncLogin: boolean) => {
  const row = new Record(app.findCollectionByNameOrId('instance_owners'))
  row.set('instance', instanceId)
  row.set('user', userId)
  row.set('sync_login', syncLogin)
  app.save(row)
}

/** Turns the owner's login sync on or off. */
export const setSyncLogin = (app: core.App, instanceId: string, syncLogin: boolean) => {
  const row = findOwnerRow(app, instanceId)
  if (!row) throw new BadRequestError(`This instance has no owner.`)
  row.set('sync_login', syncLogin)
  app.save(row)
}
