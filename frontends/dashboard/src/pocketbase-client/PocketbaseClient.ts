import {
  CreateInstancePayloadSchema,
  LoggerService,
  RestCommands,
  RestMethods,
  UpdateInstancePayload,
  UpdateInstancePayloadSchema,
  UpdateInstanceResult,
  assertExists,
  createRestHelper,
  createWatchHelper,
  type CreateInstancePayload,
  type CreateInstanceResult,
  type InstanceFields,
  type InstanceId,
  type InstanceLogFields,
} from '$shared'
import { INSTANCE_URL } from '$src/env'
import { createGenericSyncEvent } from '$util/events'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { keys, map } from '@s-libs/micro-dash'
import PocketBase, {
  BaseAuthStore,
  ClientResponseError,
  type AuthModel,
  type RecordSubscription,
  type UnsubscribeFunc,
} from 'pocketbase'

export type AuthChangeHandler = (user: BaseAuthStore) => void

export type AuthToken = string
export type AuthStoreProps = {
  token: AuthToken
  model: AuthModel | null
  isValid: boolean
}

export type PocketbaseClientConfig = {
  url: string
}
export type PocketbaseClient = ReturnType<typeof createPocketbaseClient>

export const createPocketbaseClient = (config: PocketbaseClientConfig) => {
  const { url } = config
  const _logger = LoggerService()
  const { dbg, error } = _logger

  const client = new PocketBase(url)

  const { authStore } = client

  const user = () => authStore.model as AuthStoreProps['model']

  const isLoggedIn = () => authStore.isValid

  const logOut = () => authStore.clear()

  const createUser = (email: string, password: string) =>
    client
      .collection('users')
      .create({
        email,
        password,
        passwordConfirm: password,
      })
      .then(() => {
        // dbg(`Sending verification email to ${email}`)
        return client.collection('users').requestVerification(email)
      })

  const confirmVerification = (token: string) =>
    client
      .collection('users')
      .confirmVerification(token)
      .then((response) => {
        return response
      })

  const requestPasswordReset = (email: string) =>
    client
      .collection('users')
      .requestPasswordReset(email)
      .then(() => {
        return true
      })

  const requestPasswordResetConfirm = (token: string, password: string) =>
    client
      .collection('users')
      .confirmPasswordReset(token, password, password)
      .then((response) => {
        return response
      })

  const authViaEmail = (email: string, password: string) =>
    client.collection('users').authWithPassword(email, password)

  const refreshAuthToken = () => client.collection('users').authRefresh()

  const watchHelper = createWatchHelper({ client })
  const { watchById, watchAllById } = watchHelper
  const restMixin = createRestHelper({ client, watchHelper })
  const { mkRest } = restMixin

  const createInstance = mkRest<CreateInstancePayload, CreateInstanceResult>(
    RestCommands.Instance,
    RestMethods.Create,
    CreateInstancePayloadSchema,
  )

  const updateInstance = mkRest<UpdateInstancePayload, UpdateInstanceResult>(
    RestCommands.Instance,
    RestMethods.Update,
    UpdateInstancePayloadSchema,
  )

  const getInstanceById = (
    id: InstanceId,
  ): Promise<InstanceFields | undefined> =>
    client.collection('instances').getOne<InstanceFields>(id)

  const watchInstanceById = async (
    id: InstanceId,
    cb: (data: RecordSubscription<InstanceFields>) => void,
  ): Promise<UnsubscribeFunc> => watchById('instances', id, cb)

  const getAllInstancesById = async () =>
    (await client.collection('instances').getFullList()).reduce(
      (c, v) => {
        c[v.id] = v as unknown as InstanceFields
        return c
      },
      {} as { [_: InstanceId]: InstanceFields },
    )

  const parseError = (e: Error): string[] => {
    if (!(e instanceof ClientResponseError)) return [e.message]
    if (e.data.message && keys(e.data.data).length === 0)
      return [e.data.message]
    return map(e.data.data, (v, k) => (v ? v.message : undefined)).filter(
      (v) => !!v,
    )
  }

  const resendVerificationEmail = async () => {
    const user = client.authStore.model
    assertExists(user, `Login required`)
    await client.collection('users').requestVerification(user.email)
  }

  const getAuthStoreProps = (): AuthStoreProps => {
    const { isAdmin, model, token, isValid } = client.authStore
    // dbg(`current authStore`, { token, model, isValid })
    if (isAdmin) throw new Error(`Admin models not supported`)
    if (model && !model.email)
      throw new Error(`Expected model to be a user here`)
    return {
      token,
      model,
      isValid,
    }
  }

  /**
   * Use synthetic event for authStore changers so we can broadcast just
   * the props we want and not the actual authStore object.
   */
  const [onAuthChange, fireAuthChange] = createGenericSyncEvent<BaseAuthStore>()

  /**
   * This section is for initialization
   */
  {
    /**
     * Listen for native authStore changes and convert to synthetic event
     */
    client.authStore.onChange(() => {
      fireAuthChange(client.authStore)
    })

    /**
     * Refresh the auth token immediately upon creating the client. The auth token may be
     * out of date, or fields in the user record may have changed in the backend.
     */
    refreshAuthToken()
      .catch((e) => {
        dbg(`Clearing auth store: ${e}`)
        client.authStore.clear()
      })
      .finally(() => {
        fireAuthChange(client.authStore)
      })

    /**
     * Listen for auth state changes and subscribe to realtime _user events.
     * This way, when the verified flag is flipped, it will appear that the
     * authstore model is updated.
     *
     * Polling is a stopgap til v.0.8. Once 0.8 comes along, we can do a realtime
     * watch on the user record and update auth accordingly.
     */
    const unsub = onAuthChange((authStore) => {
      // dbg(`onAuthChange`, { ...authStore })
      const { model, isAdmin } = authStore
      if (!model) return
      if (isAdmin) return
      if (model.verified) {
        unsub()
        return
      }
      setTimeout(refreshAuthToken, 1000)

      // FIXME - THIS DOES NOT WORK, WE HAVE TO POLL INSTEAD. FIX IN V0.8
      // dbg(`watching _users`)
      // unsub = subscribe<User>(`users/${model.id}`, (user) => {
      //   dbg(`realtime _users change`, { ...user })
      //   fireAuthChange({ ...authStore, model: user })
      // })
    })
  }

  const watchInstanceLog = (
    instanceId: InstanceId,
    update: (log: InstanceLogFields) => void,
    nInitial = 100,
  ): (() => void) => {
    const { dbg, trace } = _logger.create('watchInstanceLog')
    const auth = client.authStore.exportToCookie()

    const controller = new AbortController()
    const signal = controller.signal
    const continuallyFetchFromEventSource = () => {
      const url = INSTANCE_URL(instanceId, `logs`)
      dbg(`Subscribing to ${url}`)
      fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: client.authStore.token,
        },
        body: JSON.stringify({
          instanceId,
          n: nInitial,
          auth,
        }),
        onmessage: (event) => {
          dbg(`Got stream event`, event)
          const {} = event
          const log = JSON.parse(event.data) as InstanceLogFields
          dbg(`Log is`, log)
          update(log)
        },
        onopen: async (response) => {
          dbg(`Stream is open`, response)
        },
        onerror: (e) => {
          dbg(`Stream error`, e)
        },
        onclose: () => {
          setTimeout(continuallyFetchFromEventSource, 100)
          dbg(`Stream closed`)
        },
        signal,
      })
    }
    continuallyFetchFromEventSource()

    return () => {
      controller.abort()
    }
  }

  return {
    client,
    watchInstanceLog,
    getAuthStoreProps,
    parseError,
    getInstanceById,
    createInstance,
    authViaEmail,
    createUser,
    requestPasswordReset,
    requestPasswordResetConfirm,
    confirmVerification,
    logOut,
    onAuthChange,
    isLoggedIn,
    user,
    watchInstanceById,
    getAllInstancesById,
    resendVerificationEmail,
    updateInstance,
  }
}
