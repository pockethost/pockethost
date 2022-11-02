import { createGenericSyncEvent } from '$util/events'
import {
  assertExists,
  createRealtimeSubscriptionManager,
  type InstanceId,
  type Instance_In,
  type Instance_Out
} from '@pockethost/common'
import { keys, map } from '@s-libs/micro-dash'
import PocketBase, { Admin, BaseAuthStore, ClientResponseError, Record, User } from 'pocketbase'
import type { Unsubscriber } from 'svelte/store'
import { safeCatch } from '../util/safeCatch'

export type AuthChangeHandler = (user: BaseAuthStore) => void

export type AuthToken = string
export type AuthStoreProps = {
  token: AuthToken
  model: User | null
  isValid: boolean
}

export type PocketbaseClientApi = ReturnType<typeof createPocketbaseClient>

export const createPocketbaseClient = (url: string) => {
  const client = new PocketBase(url)

  const { authStore } = client

  const user = () => authStore.model

  const isLoggedIn = () => authStore.isValid

  const logOut = () => authStore.clear()

  const createUser = safeCatch(`createUser`, (email: string, password: string) =>
    client.users.create({
      email,
      password,
      passwordConfirm: password
    })
  )

  const authViaEmail = safeCatch(`authViaEmail`, (email: string, password: string) =>
    client.users.authViaEmail(email, password)
  )

  const refreshAuthToken = safeCatch(`refreshAuthToken`, () => client.users.refresh())

  const createInstance = safeCatch(
    `createInstance`,
    (payload: Instance_In): Promise<Instance_Out> => {
      return client.records.create('instances', payload).then((r) => r as unknown as Instance_Out)
    }
  )

  const getInstanceById = safeCatch(
    `getInstanceById`,
    (id: InstanceId): Promise<Instance_Out | undefined> =>
      client.records.getOne('instances', id).then((r) => r as unknown as Instance_Out)
  )

  const subscribe = createRealtimeSubscriptionManager(client)

  const watchInstanceById = (id: InstanceId, cb: (rec: Instance_Out) => void): Unsubscriber => {
    const slug = `instances/${id}`
    getInstanceById(id).then((v) => {
      if (!v) return
      cb(v)
    })
    return subscribe(slug, cb)
  }

  const getAllInstancesById = safeCatch(`getAllInstancesById`, async () =>
    (
      await client.records.getFullList('instances').catch((e) => {
        console.error(`getAllInstancesById failed with ${e}`)
        throw e
      })
    ).reduce((c, v) => {
      c[v.id] = v
      return c
    }, {} as Record)
  )

  const setInstance = safeCatch(`setInstance`, (instanceId: InstanceId, fields: Instance_In) => {
    return client.records.update('instances', instanceId, fields)
  })

  const parseError = (e: Error): string[] => {
    if (!(e instanceof ClientResponseError)) return [e.message]
    if (e.data.message && keys(e.data.data).length === 0) return [e.data.message]
    return map(e.data.data, (v, k) => (v ? v.message : undefined)).filter((v) => !!v)
  }

  const resendVerificationEmail = safeCatch(`resendVerificationEmail`, async () => {
    const user = client.authStore.model
    assertExists(user, `Login required`)
    await client.users.requestVerification(user.email)
  })

  const getAuthStoreProps = (): AuthStoreProps => {
    const { token, model, isValid } = client.authStore
    // console.log(`curent authstore`, { token, model, isValid })
    if (model instanceof Admin) throw new Error(`Admin models not supported`)
    return {
      token,
      model,
      isValid
    }
  }

  /**
   * Use synthetic event for authStore changers so we can broadcast just
   * the props we want and not the actual authStore object.
   */
  const [onAuthChange, fireAuthChange] = createGenericSyncEvent<AuthStoreProps>()

  /**
   * This section is for initialization
   */
  {
    /**
     * Listen for native authStore changes and convert to synthetic event
     */
    client.authStore.onChange(() => {
      fireAuthChange(getAuthStoreProps())
    })

    /**
     * Refresh the auth token immediately upon creating the client. The auth token may be
     * out of date, or fields in the user record may have changed in the backend.
     */
    refreshAuthToken()

    /**
     * Listen for auth state changes and subscribe to realtime _user events.
     * This way, when the verified flag is flipped, it will appear that the
     * authstore model is updated.
     *
     * Polling is a stopgap til v.0.8. Once 0.8 comes along, we can do a realtime
     * watch on the user record and update auth accordingly.
     */
    const unsub = onAuthChange((authStore) => {
      console.log(`onAuthChange`, { ...authStore })
      const { model } = authStore
      if (!model) return
      if (model instanceof Admin) return
      if (model.verified) {
        unsub()
        return
      }
      const _check = safeCatch(`_checkVerified`, () => client.users.refresh())
      setTimeout(_check, 1000)

      // FIXME - THIS DOES NOT WORK, WE HAVE TO POLL INSTEAD. FIX IN V0.8
      // console.log(`watching _users`)
      // unsub = subscribe<User>(`users/${model.id}`, (user) => {
      //   console.log(`realtime _users change`, { ...user })
      //   fireAuthChange({ ...authStore, model: user })
      // })
    })
  }

  return {
    getAuthStoreProps,
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
    setInstance,
    resendVerificationEmail
  }
}
