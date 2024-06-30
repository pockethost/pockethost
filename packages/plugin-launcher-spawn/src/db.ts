import { find } from '@s-libs/micro-dash'
import { JSONFileSyncPreset } from 'lowdb/node'
import { InstanceFields, InstanceId, mkSingleton, pocketNow } from 'pockethost'
import { PLUGIN_DATA } from './constants'
import { info } from './log'

export const DbService = mkSingleton(async () => {
  const db = JSONFileSyncPreset<{
    instances: { [key: InstanceId]: InstanceFields }
  }>(PLUGIN_DATA('db.json'), { instances: {} })

  const deleteInstance = (id: InstanceId) => {
    db.update((data) => {
      delete data.instances[id]
    })
    info(`Deleted instance ${id}`)
  }

  const createOrUpdateInstance = (instance: InstanceFields) => {
    if (!instance.id) {
      throw new Error(`Instance id is required`)
    }
    db.update((data) => {
      data.instances[instance.id] = {
        ...instance,
        updated: instance.id in data.instances ? pocketNow() : instance.updated,
      }
    })
    info(`Added/updated instance ${instance.id}`)
  }

  const getInstanceById = (id: InstanceId) => db.data.instances[id]
  const getInstanceBySubdomain = (subdomain: string) =>
    find(db.data.instances, (v, k) => v.subdomain === subdomain)

  const getInstancesByExactCriteria = (
    criteria: Partial<InstanceFields | { [_: string]: number | string }>,
  ) =>
    Object.values(db.data.instances).filter((instance) =>
      Object.entries(criteria).every(
        ([k, v]) => instance[k as unknown as keyof InstanceFields] === v,
      ),
    )

  return {
    createOrUpdateInstance,
    deleteInstance,
    getInstanceById,
    getInstanceBySubdomain,
    getInstancesByExactCriteria,
  }
})
