import { JSONFileSyncPreset } from 'lowdb/node'
import { InstanceFields, InstanceId, mkSingleton } from 'pockethost'
import { PLUGIN_DATA } from './constants'
import { info } from './log'

export const DbService = mkSingleton(async () => {
  const db = await JSONFileSyncPreset<{
    instances: { [key: InstanceId]: InstanceFields }
  }>(PLUGIN_DATA('db.json'), { instances: {} })

  const deleteInstance = (id: InstanceId) => {
    db.update((data) => {
      delete data.instances[id]
    })
    info(`Deleted instance ${id}`)
  }

  const addInstance = (instance: InstanceFields) => {
    db.update((data) => (data.instances[instance.id] = instance))
    info(`Added instance ${instance.id}`)
  }

  const getInstanceById = (id: InstanceId) => db.data.instances[id]

  return {
    addInstance,
    deleteInstance,
    getInstanceById,
  }
})
