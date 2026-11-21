import type { InstanceOwnerFields, PocketBase, UserFields } from '@'

/**
 * Who owns which instance, read from the mothership's `instance_owners` (one row per owned instance; was
 * `instances.uid`). For the Node jobs that still run on sfo-2 (SFTP, over-limit, archiving), with a superuser client.
 */

/** Instance id -> owner's user id, for every owned instance. */
export const fetchOwnerMap = async (pb: PocketBase): Promise<Map<string, string>> => {
  const rows = await pb
    .collection(`instance_owners`)
    .getFullList<Pick<InstanceOwnerFields, 'instance' | 'user'>>({ fields: `instance,user`, batch: 1000 })
  return new Map(rows.map((r) => [r.instance, r.user]))
}

/** The instance's owner row with the user expanded, or undefined when it has none. */
export const fetchOwner = async (
  pb: PocketBase,
  instanceId: string
): Promise<(InstanceOwnerFields & { expand?: { user?: UserFields } }) | undefined> => {
  try {
    return await pb
      .collection(`instance_owners`)
      .getFirstListItem<
        InstanceOwnerFields & { expand?: { user?: UserFields } }
      >(`instance = ${JSON.stringify(instanceId)}`, { expand: `user` })
  } catch {
    return undefined
  }
}

/** The ids of every instance the user owns. */
export const fetchOwnedInstanceIds = async (pb: PocketBase, userId: string): Promise<string[]> => {
  const rows = await pb.collection(`instance_owners`).getFullList<Pick<InstanceOwnerFields, 'instance'>>({
    filter: `user = ${JSON.stringify(userId)}`,
    fields: `instance`,
    batch: 1000,
  })
  return rows.map((r) => r.instance)
}
