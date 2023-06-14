import {
  assertExists,
  InstanceFields,
  InstanceFields_Create,
  InstanceId,
  InstanceStatus,
  safeCatch,
  UserFields,
} from '@pockethost/common'
import { reduce } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { endOfMonth, startOfMonth } from 'date-fns'
import { MixinContext } from './PbClient'

export type InstanceApi = ReturnType<typeof createInstanceMixin>

export const createInstanceMixin = (context: MixinContext) => {
  const { logger } = context
  const { dbg, raw } = logger.create('InstanceMixin')

  const { client, rawDb } = context

  const createInstance = safeCatch(
    `createInstance`,
    logger,
    (payload: InstanceFields_Create): Promise<InstanceFields> => {
      return client.collection('instances').create<InstanceFields>(payload)
    }
  )

  const getInstanceBySubdomain = safeCatch(
    `getInstanceBySubdomain`,
    logger,
    (subdomain: string): Promise<[InstanceFields, UserFields] | []> =>
      client
        .collection('instances')
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
  )

  const getInstanceById = safeCatch(
    `getInstanceById`,
    logger,
    async (
      instanceId: InstanceId
    ): Promise<[InstanceFields, UserFields] | []> => {
      return client
        .collection('instances')
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
    }
  )

  const updateInstance = safeCatch(
    `updateInstance`,
    logger,
    async (instanceId: InstanceId, fields: Partial<InstanceFields>) => {
      await client.collection('instances').update(instanceId, fields)
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
      return client.collection('instances').getOne<InstanceFields>(instanceId)
    }
  )

  const getInstances = safeCatch(`getInstances`, logger, async () => {
    return client.collection('instances').getFullList<InstanceFields>()
  })

  const updateInstances = safeCatch(
    'updateInstances',
    logger,
    async (cb: (rec: InstanceFields) => Partial<InstanceFields>) => {
      const res = await client
        .collection('instances')
        .getFullList<InstanceFields>(200)
      const limiter = new Bottleneck({ maxConcurrent: 1 })
      const promises = reduce(
        res,
        (c, r) => {
          c.push(
            limiter.schedule(() => {
              const toUpdate = cb(r)
              dbg(`Updating instance ${r.id} with ${JSON.stringify(toUpdate)}`)
              return client.collection('instances').update(r.id, toUpdate)
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
  }
}
