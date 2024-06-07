import { INSTANCE_URL } from '$src/env'
import { createGenericSyncEvent } from '$util/events'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { keys, map } from '@s-libs/micro-dash'
import {
  AuthModel,
  BaseAuthStore,
  ClientResponseError,
  CreateInstancePayloadSchema,
  DeleteInstancePayload,
  DeleteInstancePayloadSchema,
  DeleteInstanceResult,
  PocketBase,
  RestCommands,
  RestMethods,
  UpdateInstancePayload,
  UpdateInstancePayloadSchema,
  UpdateInstanceResult,
  assertExists,
  createRestHelper,
  type CreateInstancePayload,
  type CreateInstanceResult,
  type InstanceFields,
  type InstanceId,
  type InstanceLogFields,
} from 'pockethost/common'

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

  const client = new PocketBase(url)

  const { authStore } = client

  const user = () => authStore.model as AuthStoreProps['model']

  const isLoggedIn = () => authStore.isValid

  const logOut = () => authStore.clear()

  /**
   * This will register a new user into Pocketbase, and email them a
   * verification link
   *
   * @param email {string} The email of the user
   * @param password {string} The password of the user
   */
  const createUser = async (email: string, password: string) => {
    // Build the new user object and any additional properties needed
    const data = {
      email,
      password,
      passwordConfirm: password,
    }

    // Create the user
    const record = await client.collection('users').create(data)

    // Send the verification email
    await resendVerificationEmail()

    return record
  }

  /**
   * This will let a user confirm their new account via a token in their email
   *
   * @param token {string} The token from the verification email
   */
  const confirmVerification = async (token: string) => {
    return await client.collection('users').confirmVerification(token)
  }

  /**
   * This will reset an unauthenticated user's password by sending a
   * verification link to their email, and includes an optional error handler
   *
   * @param email {string} The email of the user
   */
  const requestPasswordReset = async (email: string) => {
    return await client.collection('users').requestPasswordReset(email)
  }

  /**
   * This will let an unauthenticated user save a new password after verifying
   * their email
   *
   * @param token {string} The token from the verification email
   * @param password {string} The new password of the user
   */
  const requestPasswordResetConfirm = async (
    token: string,
    password: string,
  ) => {
    return await client
      .collection('users')
      .confirmPasswordReset(token, password, password)
  }

  /**
   * This will log a user into Pocketbase, and includes an optional error
   * handler
   *
   * @param {string} email The email of the user
   * @param {string} password The password of the user
   */
  const authViaEmail = async (email: string, password: string) => {
    return await client.collection('users').authWithPassword(email, password)
  }

  const refreshAuthToken = () => client.collection('users').authRefresh()

  const restMixin = createRestHelper({ client })
  const { mkRest } = restMixin

  const createInstance = mkRest<CreateInstancePayload, CreateInstanceResult>(
    RestCommands.Instance,
    RestMethods.Post,
    CreateInstancePayloadSchema,
  )

  const updateInstance = mkRest<UpdateInstancePayload, UpdateInstanceResult>(
    RestCommands.Instance,
    RestMethods.Put,
    UpdateInstancePayloadSchema,
  )

  const deleteInstance = mkRest<DeleteInstancePayload, DeleteInstanceResult>(
    RestCommands.Instance,
    RestMethods.Delete,
    DeleteInstancePayloadSchema,
  )

  const getInstanceById = (
    id: InstanceId,
  ): Promise<InstanceFields | undefined> =>
    client.collection('instances').getOne<InstanceFields>(id)

  const getInstanceBySubdomain = (
    subdomain: InstanceFields['subdomain'],
  ): Promise<InstanceFields | undefined> =>
    client
      .collection('instances')
      .getFirstListItem<InstanceFields>(`subdomain='${subdomain}'`)

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
   * Use synthetic event for authStore changers, so we can broadcast just the
   * props we want and not the actual authStore object.
   */
  const [onAuthChange, fireAuthChange] = createGenericSyncEvent<BaseAuthStore>()

  /** This section is for initialization */
  {
    /** Listen for native authStore changes and convert to synthetic event */
    client.authStore.onChange(() => {
      fireAuthChange(client.authStore)
    })

    /**
     * Refresh the auth token immediately upon creating the client. The auth
     * token may be out of date, or fields in the user record may have changed
     * in the backend.
     */
    refreshAuthToken()
      .catch((error) => {
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
     * Polling is a stopgap til v.0.8. Once 0.8 comes along, we can do a
     * realtime watch on the user record and update auth accordingly.
     */
    const unsub = onAuthChange((authStore) => {
      const { model, isAdmin } = authStore
      if (!model) return
      if (isAdmin) return
      if (model.verified) {
        unsub()
        return
      }
      setTimeout(refreshAuthToken, 1000)

      // TODO - THIS DOES NOT WORK, WE HAVE TO POLL INSTEAD. FIX IN V0.8
      // unsub = subscribe<User>(`users/${model.id}`, (user) => {
      //   fireAuthChange({ ...authStore, model: user })
      // })
    })
  }

  const watchInstanceLog = (
    instance: InstanceFields,
    update: (log: InstanceLogFields) => void,
    nInitial = 100,
  ): (() => void) => {
    const auth = client.authStore.exportToCookie()

    const controller = new AbortController()
    const signal = controller.signal
    const continuallyFetchFromEventSource = () => {
      const url = INSTANCE_URL(instance, `logs`)

      fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: client.authStore.token,
        },
        openWhenHidden: true,
        body: JSON.stringify({
          instanceId: instance.id,
          n: nInitial,
          auth,
        }),
        onmessage: (event) => {
          const {} = event
          const log = JSON.parse(event.data) as InstanceLogFields

          update(log)
        },
        onopen: async (response) => {},
        onerror: (e) => {},
        onclose: () => {
          setTimeout(continuallyFetchFromEventSource, 100)
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
    getInstanceBySubdomain,
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
    getAllInstancesById,
    resendVerificationEmail,
    updateInstance,
    deleteInstance,
  }
}
