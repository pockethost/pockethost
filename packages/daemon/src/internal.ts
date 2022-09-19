import { pocketbase } from '@pockethost/common/src/pocketbase'
import {
  InstanceId,
  Instance_Internal_In,
  Instance_Internal_Out,
  Instance_Internal_Out_ByIdCollection,
  InternalInstanceId,
  Password,
  Port,
  Username,
} from '@pockethost/common/src/schema'
import Bottleneck from 'bottleneck'
import { identity } from 'ts-brand'

const limiter = new Bottleneck({ maxConcurrent: 1 })

const client = pocketbase

export const adminAuthViaEmail = (username: Username, password: Password) =>
  client.admins.authViaEmail(username, password)

export const getAllInternalInstancesByInstanceId = async () =>
  (
    await limiter
      .schedule(() => client.records.getFullList('instances_internal'))
      .catch((e) => {
        console.error(`getAllInternalInstancesById failed with ${e}`)
        throw e
      })
  ).reduce((c, v) => {
    const _v = identity<Instance_Internal_Out>(v)
    c[identity<InstanceId>(_v.instanceId)] = _v
    return c
  }, {} as Instance_Internal_Out_ByIdCollection)

export const setInternalInstancePort = (
  instanceId: InternalInstanceId,
  port: Port
) =>
  limiter
    .schedule(() =>
      client.records.update('instances_internal', instanceId, { port })
    )
    .catch((e) => {
      console.error(
        `setInternalInstancePort failed for ${instanceId} port ${port} with ${e}`
      )
      throw e
    })

export const setInternalInstance = (
  instanceId: InternalInstanceId,
  fields: Instance_Internal_In
) => {
  console.log(`${instanceId} setting fields`, { fields })
  return limiter
    .schedule(() =>
      client.records.update('instances_internal', instanceId, fields)
    )
    .catch((e) => {
      console.error(`setInternalInstance failed for ${instanceId} with ${e}`, {
        fields,
      })
      throw e
    })
}

export const linkInternalInstance = async (instanceId: InstanceId) => {
  const _in: Instance_Internal_In = {
    instanceId,
  }
  return (await limiter
    .schedule(() => client.records.create('instances_internal', _in))
    .catch((e) => {
      console.error(`linkInternalInstance failed for ${instanceId} with ${e}`)
      throw e
    })) as unknown as Instance_Internal_Out
}
