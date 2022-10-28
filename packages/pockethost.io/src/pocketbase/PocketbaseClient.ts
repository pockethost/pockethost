import {
  assertExists,
  createRealtimeSubscriptionManager,
  type InstanceId,
  type Instance_In,
  type Instance_Out
} from '@pockethost/common'
import { keys, map } from '@s-libs/micro-dash'
import PocketBase, { BaseAuthStore, ClientResponseError, Record } from 'pocketbase'
import type { Unsubscriber } from 'svelte/store'

export type AuthChangeHandler = (user: BaseAuthStore) => void

export const createPocketbaseClient = (url: string) => {
  const client = new PocketBase(url)

  const { authStore } = client

  const user = () => authStore.model

  const isLoggedIn = () => authStore.isValid

  const onAuthChange = (cb: AuthChangeHandler): Unsubscriber =>
    authStore.onChange(() => {
      cb(authStore)
    })

  const logOut = () => authStore.clear()

  const createUser = (email: string, password: string) =>
    client.users.create({
      email,
      password,
      passwordConfirm: password
    })

  const authViaEmail = (email: string, password: string) =>
    client.users.authViaEmail(email, password)

  const refreshUserData = async () => {
    return await client.users.refresh()
  }

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

  const resendVerificationEmail = async () => {
    const user = client.authStore.model
    assertExists(user, `Login required`)
    await client.users.requestVerification(user.email)
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
    refreshUserData,
    watchInstanceById,
    getAllInstancesById,
    setInstance,
    resendVerificationEmail
  }
}
