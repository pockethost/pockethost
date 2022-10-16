import type { InstanceId, Instance_In, Instance_Out } from '@pockethost/common'
import { createRealtimeSubscriptionManager } from '@pockethost/common'
import { keys, map } from '@s-libs/micro-dash'
import PocketBase, { BaseAuthStore, ClientResponseError, Record } from 'pocketbase'
import type { Unsubscriber } from 'svelte/store'

export const createPocketbaseClient = (url: string) => {
  const client = new PocketBase(url)

  const { authStore } = client

  const { onChange } = authStore

  const user = () => authStore.model

  const isLoggedIn = () => authStore.isValid

  const onAuthChange = (cb: (user: BaseAuthStore) => Unsubscriber) => onChange(() => cb(authStore))

  const logOut = () => authStore.clear()

  const createUser = (email: string, password: string) =>
    client.users.create({
      email,
      password,
      passwordConfirm: password
    })

  const authViaEmail = (email: string, password: string) =>
    client.users.authViaEmail(email, password)

  const createInstance = (payload: Instance_In): Promise<Instance_Out> => {
    return client.records.create('instances', payload).then((r) => r as unknown as Instance_Out)
  }

  const getInstanceById = (id: InstanceId): Promise<Instance_Out | undefined> =>
    client.records.getOne('instances', id).then((r) => r as unknown as Instance_Out)

  const subscribe = createRealtimeSubscriptionManager(client)

  const watchInstanceById = (id: InstanceId, cb: (rec: Instance_Out) => void): Unsubscriber => {
    const slug = `instances/${id}`
    getInstanceById(id).then((v) => {
      if (!v) return
      console.log(`Initial record`, { v })
      cb(v)
    })
    return subscribe(slug, cb)
  }

  const getAllInstancesById = async () =>
    (
      await client.records.getFullList('instances').catch((e) => {
        console.error(`getAllInstancesById failed with ${e}`)
        throw e
      })
    ).reduce((c, v) => {
      c[v.id] = v
      return c
    }, {} as Record)

  const setInstance = (instanceId: InstanceId, fields: Instance_In) => {
    console.log(`${instanceId} setting fields`, { fields })
    return client.records.update('instances', instanceId, fields).catch((e) => {
      console.error(`setInstance failed for ${instanceId} with ${e}`, {
        fields
      })
      throw e
    })
  }

  const parseError = (e: Error): string[] => {
    if (!(e instanceof ClientResponseError)) return [e.message]
    if (e.data.message && keys(e.data.data).length === 0) return [e.data.message]
    return map(e.data.data, (v, k) => (v ? v.message : undefined)).filter((v) => !!v)
  }

  return {
    parseError,
    subscribe,
    getInstanceById,
    createInstance,
    authViaEmail,
    createUser,
    logOut,
    onAuthChange,
    isLoggedIn,
    user,
    watchInstanceById,
    getAllInstancesById,
    setInstance
  }
}
