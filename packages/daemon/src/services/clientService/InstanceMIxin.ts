import {
  assertExists,
  InstanceFields,
  InstanceFields_Create,
  InstanceId,
  InstanceStatus,
  INSTANCE_COLLECTION,
  safeCatch,
  UserFields,
} from '@pockethost/common'
import { reduce } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { endOfMonth, startOfMonth } from 'date-fns'
import { AsyncContext } from '../../util/AsyncContext'
import { MixinContext } from './PbClient'

export type InstanceApi = ReturnType<typeof createInstanceMixin>

export const createInstanceMixin = (context: MixinContext) => {
  const { logger } = context
  const { dbg, raw } = logger.create('InstanceMixin')

  const { client, rawDb } = context

  const resetInstances = safeCatch(`resetRpcs`, logger, async () =>
    rawDb(INSTANCE_COLLECTION).update<InstanceFields>({
      status: InstanceStatus.Idle,
    })
  )

  const createInstance = safeCatch(
    `createInstance`,
    logger,
    (payload: InstanceFields_Create): Promise<InstanceFields> => {
      return client
        .collection(INSTANCE_COLLECTION)
        .create<InstanceFields>(payload)
    }
  )

  const getInstanceBySubdomain = safeCatch(
    `getInstanceBySubdomain`,
    logger,
    (subdomain: string): Promise<[InstanceFields, UserFields] | []> =>
      client
        .collection(INSTANCE_COLLECTION)
        .getFirstListItem<InstanceFields>(`subdomain = '${subdomain}'`, {
          $autoCancel: false,
        })
        .then((instance) => {
          if (!instance) return []
          return client
            .collection('users')
            .getOne<UserFields>(instance.uid, {
              $autoCancel: false,
            })
            .then((user) => {
              return [instance, user]
            })
        })
  )

  const getInstanceById = async (
    instanceId: InstanceId,
    context?: AsyncContext
  ): Promise<[InstanceFields, UserFields] | []> =>
    client
      .collection(INSTANCE_COLLECTION)
      .getOne<InstanceFields>(instanceId, {
        $autoCancel: false,
      })
      .then((instance) => {
        if (!instance) return []
        return client
          .collection('users')
          .getOne<UserFields>(instance.uid, {
            $autoCancel: false,
          })
          .then((user) => {
            return [instance, user]
          })
      })

  const updateInstance = safeCatch(
    `updateInstance`,
    logger,
    async (instanceId: InstanceId, fields: Partial<InstanceFields>) => {
      await client.collection(INSTANCE_COLLECTION).update(instanceId, fields)
    }
  )

  const updateInstanceStatus = safeCatch(
    `updateInstanceStatus`,
    logger,
    async (instanceId: InstanceId, status: InstanceStatus) => {
      await updateInstance(instanceId, { status })
    }
  )

  const getInstance = safeCatch(
    `getInstance`,
    logger,
    async (instanceId: InstanceId) => {
      return client
        .collection(INSTANCE_COLLECTION)
        .getOne<InstanceFields>(instanceId)
    }
  )

  const getInstances = safeCatch(`getInstances`, logger, async () => {
    return client.collection(INSTANCE_COLLECTION).getFullList<InstanceFields>()
  })

  const updateInstances = safeCatch(
    'updateInstances',
    logger,
    async (cb: (rec: InstanceFields) => Partial<InstanceFields>) => {
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
              return client
                .collection(INSTANCE_COLLECTION)
                .update(r.id, toUpdate)
            })
          )
          return c
        },
        [] as Promise<void>[]
      )
      await Promise.all(promises)
    }
  )

  const updateInstanceSeconds = safeCatch(
    `updateInstanceSeconds`,
    logger,
    async (instanceId: InstanceId, forPeriod = new Date()) => {
      const startIso = startOfMonth(forPeriod).toISOString()
      const endIso = endOfMonth(forPeriod).toISOString()
      const query = rawDb('invocations')
        .sum('totalSeconds as t')
        .where('instanceId', instanceId)
        .where('startedAt', '>=', startIso)
        .where('startedAt', '<=', endIso)
      raw(query.toString())
      const res = await query
      const [row] = res
      assertExists(row, `Expected row here`)
      const secondsThisMonth = row.t
      await updateInstance(instanceId, { secondsThisMonth })
    }
  )

  return {
    getInstanceById,
    getInstances,
    updateInstance,
    updateInstanceStatus,
    getInstanceBySubdomain,
    getInstance,
    updateInstanceSeconds,
    updateInstances,
    createInstance,
    resetInstances,
  }
}
