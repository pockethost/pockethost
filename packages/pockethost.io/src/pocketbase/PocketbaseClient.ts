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

export type AuthChangeHandler = (user: BaseAuthStore) => void

export type AuthToken = string
export type AuthStoreProps = {
  token: AuthToken
  model: User | null
  isValid: boolean
}

export type PocketbaseClientApi = ReturnType<typeof createPocketbaseClient>

const safeCatch = <TIn extends any[], TOut>(name: string, cb: (...args: TIn) => Promise<TOut>) => {
  return (...args: TIn) => {
    console.log(`${name}`)
    return cb(...args).catch((e: any) => {
      console.error(`${name} failed: ${e}`)
      throw e
    })
  }
}

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

  const [onAuthChange, fireAuthChange] = createGenericSyncEvent<AuthStoreProps>()

  client.authStore.onChange(() => {
    console.log(`native authstore change`, { ...authStore })
    fireAuthChange(getAuthStoreProps())
  })
  client.users
    .refresh()
    .then((res) => {
      console.log(`User token refreshed`, res)
    })
    .catch(() => {})

  {
    /**
     * Listen for auth state changes and subscribe to realtime _user events.
     * This way, when the verified flag is flipped, it will appear that the
     * authstore model is updated.
     */
    let unsub: Unsubscriber | undefined
    onAuthChange((authStore) => {
      console.log(`onAuthChange`, { ...authStore })
      unsub?.()
      const { model } = authStore
      if (!model) return
      if (model instanceof Admin) return

      console.log(`watching _users`)
      unsub = subscribe<User>(`users/${model.id}`, (user) => {
        console.log(`realtime _users change`, { ...user })
        fireAuthChange({ ...authStore, model: user })
      })
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
