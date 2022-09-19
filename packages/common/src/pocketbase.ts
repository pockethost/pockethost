import pocketbaseEs, { BaseAuthStore } from 'pocketbase'
import type { Unsubscriber } from 'svelte/store'
import { identity } from 'ts-brand'
import { createRealtimeSubscriptionManager } from './RealtimeSubscriptionManager'
import type {
  InstanceId,
  Instance_In,
  Instance_Out,
  Instance_Out_ByIdCollection,
} from './schema'

const client = new pocketbaseEs('https://pockethost-central.pockethost.io')

const { authStore } = client

const { onChange } = authStore

export const user = () => authStore.model

export const isLoggedIn = () => authStore.isValid

export const onAuthChange = (cb: (user: BaseAuthStore) => Unsubscriber) =>
  onChange(() => cb(authStore))

export const logOut = () => authStore.clear()

export const createUser = (email: string, password: string) =>
  client.users.create({
    email,
    password,
    passwordConfirm: password,
  })

export const authViaEmail = (email: string, password: string) =>
  client.users.authViaEmail(email, password)

export const pocketbase = client

export const createInstance = (payload: Instance_In): Promise<Instance_Out> => {
  return pocketbase.records
    .create('instances', payload)
    .then((r) => r as unknown as Instance_Out)
}

export const getInstanceById = (
  id: InstanceId
): Promise<Instance_Out | undefined> =>
  pocketbase.records
    .getOne('instances', id)
    .then((r) => r as unknown as Instance_Out)

const subscribe = createRealtimeSubscriptionManager()

export const watchInstanceById = (
  id: InstanceId,
  cb: (rec: Instance_Out) => void
): Unsubscriber => {
  const slug = `instances/${id}`
  getInstanceById(id).then((v) => {
    if (!v) return
    console.log(`Initial record`, { v })
    cb(v)
  })
  return subscribe(slug, cb)
}

export const getAllInstancesById = async () =>
  (
    await client.records.getFullList('instances').catch((e) => {
      console.error(`getAllInstancesById failed with ${e}`)
      throw e
    })
  ).reduce((c, v) => {
    const _v = identity<Instance_Out>(v)
    c[_v.id] = _v
    return c
  }, {} as Instance_Out_ByIdCollection)

export const setInstance = (instanceId: InstanceId, fields: Instance_In) => {
  console.log(`${instanceId} setting fields`, { fields })
  return client.records.update('instances', instanceId, fields).catch((e) => {
    console.error(`setInstance failed for ${instanceId} with ${e}`, {
      fields,
    })
    throw e
  })
}
