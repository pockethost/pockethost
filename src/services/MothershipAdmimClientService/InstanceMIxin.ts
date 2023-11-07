import {
  INSTANCE_COLLECTION,
  InstanceFields,
  InstanceFields_Create,
  InstanceId,
  InstanceStatus,
  UserFields,
} from '$shared'
import { reduce } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { MixinContext } from '.'

export type InstanceApi = ReturnType<typeof createInstanceMixin>

export const createInstanceMixin = (context: MixinContext) => {
  const { logger } = context
  const { dbg, raw } = logger.create('InstanceMixin')

  const { client } = context

  const createInstance = (
    payload: InstanceFields_Create,
  ): Promise<InstanceFields> => {
    return client
      .collection(INSTANCE_COLLECTION)
      .create<InstanceFields>(payload)
  }

  const getInstanceBySubdomain = (
    subdomain: string,
  ): Promise<[InstanceFields, UserFields] | []> =>
    client
      .collection(INSTANCE_COLLECTION)
      .getFirstListItem<InstanceFields>(`subdomain = '${subdomain}'`)
      .then((instance) => {
        if (!instance) return []
        return client
          .collection('users')
          .getOne<UserFields>(instance.uid)
          .then((user) => {
            return [instance, user]
          })
      })

  const getInstanceById = async (
    instanceId: InstanceId,
  ): Promise<[InstanceFields, UserFields] | []> =>
    client
      .collection(INSTANCE_COLLECTION)
      .getOne<InstanceFields>(instanceId)
      .then((instance) => {
        if (!instance) return []
        return client
          .collection('users')
          .getOne<UserFields>(instance.uid)
          .then((user) => {
            return [instance, user]
          })
      })

  const updateInstance = async (
    instanceId: InstanceId,
    fields: Partial<InstanceFields>,
  ) => {
    await client.collection(INSTANCE_COLLECTION).update(instanceId, fields)
  }

  const updateInstanceStatus = async (
    instanceId: InstanceId,
    status: InstanceStatus,
  ) => {
    await updateInstance(instanceId, { status })
  }

  const getInstance = async (instanceId: InstanceId) => {
    return client
      .collection(INSTANCE_COLLECTION)
      .getOne<InstanceFields>(instanceId)
  }

  const getInstances = async () => {
    return client.collection(INSTANCE_COLLECTION).getFullList<InstanceFields>()
  }

  const updateInstances = async (
    cb: (rec: InstanceFields) => Partial<InstanceFields>,
  ) => {
    const res = await client
      .collection(INSTANCE_COLLECTION)
      .getFullList<InstanceFields>(200)
    const limiter = new Bottleneck({ maxConcurrent: 1 })
    const promises = reduce(
      res,
      (c, r) => {
        c.push(
          limiter.schedule(() => {
            const toUpdate = cb(r)
            dbg(`Updating instance ${r.id} with ${JSON.stringify(toUpdate)}`)
            return client.collection(INSTANCE_COLLECTION).update(r.id, toUpdate)
          }),
        )
        return c
      },
      [] as Promise<void>[],
    )
    await Promise.all(promises)
  }

  return {
    getInstanceById,
    getInstances,
    updateInstance,
    updateInstanceStatus,
    getInstanceBySubdomain,
    getInstance,
    updateInstances,
    createInstance,
  }
}
