import { MixinContext } from '.'
import {
  INSTANCE_COLLECTION,
  InstanceFields,
  InstanceFields_Create,
  InstanceId,
  InstanceStatus,
  WithUser,
} from '../../../core'

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
  ): Promise<InstanceFields & WithUser> =>
    client
      .collection(INSTANCE_COLLECTION)
      .getFirstListItem(`subdomain = '${subdomain}'`, { expand: 'uid' })

  const getInstanceByCname = (
    host: string,
  ): Promise<InstanceFields & WithUser> =>
    client
      .collection(INSTANCE_COLLECTION)
      .getFirstListItem(`cname = '${host}'`, {
        expand: 'uid',
      })

  const getInstanceById = async (
    instanceId: InstanceId,
  ): Promise<InstanceFields & WithUser> =>
    client.collection(INSTANCE_COLLECTION).getOne(instanceId, { expand: 'uid' })

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

  const getInstance = async (
    instanceId: InstanceId,
  ): Promise<InstanceFields & WithUser> => {
    return client
      .collection(INSTANCE_COLLECTION)
      .getOne(instanceId, { expand: 'uid' })
  }

  const getInstances = async () => {
    return client.collection(INSTANCE_COLLECTION).getFullList<InstanceFields>()
  }

  return {
    getInstanceById,
    getInstances,
    updateInstance,
    updateInstanceStatus,
    getInstanceBySubdomain,
    getInstanceByCname,
    getInstance,
    createInstance,
  }
}
