import { createGenericSyncEvent } from '$util/events'
import {
  assertExists,
  JobCommands,
  JobStatus,
  type BackupRecord,
  type InstanceBackupJobPayload,
  type InstanceBackupJobRecord,
  type InstanceId,
  type InstancesRecord,
  type InstancesRecord_New,
  type JobRecord,
  type JobRecord_In,
  type UserRecord
} from '@pockethost/common'
import { keys, map } from '@s-libs/micro-dash'
import PocketBase, {
  Admin,
  BaseAuthStore,
  ClientResponseError,
  Record,
  type RecordSubscription
} from 'pocketbase'
import type { Unsubscriber } from 'svelte/store'
import { safeCatch } from '../util/safeCatch'

export type AuthChangeHandler = (user: BaseAuthStore) => void

export type AuthToken = string
export type AuthStoreProps = {
  token: AuthToken
  model: UserRecord | null
  isValid: boolean
}

export type PocketbaseClientApi = ReturnType<typeof createPocketbaseClient>

export const createPocketbaseClient = (url: string) => {
  const client = new PocketBase(url)

  const { authStore } = client

  const user = () => authStore.model as AuthStoreProps['model']

  const isLoggedIn = () => authStore.isValid

  const logOut = () => authStore.clear()

  const createUser = safeCatch(`createUser`, (email: string, password: string) =>
    client
      .collection('users')
      .create({
        email,
        password,
        passwordConfirm: password
      })
      .then(() => {
        console.log(`Sending verification email to ${email}`)
        return client.collection('users').requestVerification(email)
      })
  )

  const authViaEmail = safeCatch(`authViaEmail`, (email: string, password: string) =>
    client.collection('users').authWithPassword(email, password)
  )

  const refreshAuthToken = safeCatch(`refreshAuthToken`, () =>
    client.collection('users').authRefresh()
  )

  const createInstance = safeCatch(
    `createInstance`,
    (payload: InstancesRecord_New): Promise<InstancesRecord> => {
      return client.collection('instances').create<InstancesRecord>(payload)
    }
  )

  const getInstanceById = safeCatch(
    `getInstanceById`,
    (id: InstanceId): Promise<InstancesRecord | undefined> =>
      client.collection('instances').getOne<InstancesRecord>(id)
  )

  const watchInstanceById = async (
    id: InstanceId,
    cb: (data: RecordSubscription<InstancesRecord>) => void
  ): Promise<Unsubscriber> => {
    getInstanceById(id).then((record) => {
      console.log(`Got instance`, record)
      assertExists(record, `Expected instance ${id} here`)
      cb({ action: 'init', record })
    })
    return client.collection('instances').subscribe<InstancesRecord>(id, cb)
  }

  const watchBackupsByInstanceId = async (
    id: InstanceId,
    cb: (data: RecordSubscription<BackupRecord>) => void
  ): Promise<Unsubscriber> => {
    const unsub = client.collection('backups').subscribe<BackupRecord>('*', (e) => {
      console.log(e.record.instanceId, id)
      if (e.record.instanceId !== id) return
      cb(e)
    })
    const existingBackups = await client
      .collection('backups')
      .getFullList<BackupRecord>(100, { filter: `instanceId = '${id}'` })
    existingBackups.forEach((record) => cb({ action: 'init', record }))
    return unsub
  }

  const getAllInstancesById = safeCatch(`getAllInstancesById`, async () =>
    (
      await client
        .collection('instances')
        .getFullList()
        .catch((e) => {
          console.error(`getAllInstancesById failed with ${e}`)
          throw e
        })
    ).reduce((c, v) => {
      c[v.id] = v
      return c
    }, {} as Record)
  )

  const parseError = (e: Error): string[] => {
    if (!(e instanceof ClientResponseError)) return [e.message]
    if (e.data.message && keys(e.data.data).length === 0) return [e.data.message]
    return map(e.data.data, (v, k) => (v ? v.message : undefined)).filter((v) => !!v)
  }

  const resendVerificationEmail = safeCatch(`resendVerificationEmail`, async () => {
    const user = client.authStore.model
    assertExists(user, `Login required`)
    await client.collection('users').requestVerification(user.email)
  })

  const getAuthStoreProps = (): AuthStoreProps => {
    const { token, model, isValid } = client.authStore as AuthStoreProps
    // console.log(`current authStore`, { token, model, isValid })
    if (model instanceof Admin) throw new Error(`Admin models not supported`)
    if (model && !model.email) throw new Error(`Expected model to be a user here`)
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
      .catch((e) => {
        console.error(`Clearing auth store: ${e}`)
        client.authStore.clear()
      })
      .finally(() => {
        fireAuthChange(getAuthStoreProps())
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
      console.log(`onAuthChange`, { ...authStore })
      const { model } = authStore
      if (!model) return
      if (model instanceof Admin) return
      if (model.verified) {
        unsub()
        return
      }
      const _check = safeCatch(`_checkVerified`, refreshAuthToken)
      setTimeout(_check, 1000)

      // FIXME - THIS DOES NOT WORK, WE HAVE TO POLL INSTEAD. FIX IN V0.8
      // console.log(`watching _users`)
      // unsub = subscribe<User>(`users/${model.id}`, (user) => {
      //   console.log(`realtime _users change`, { ...user })
      //   fireAuthChange({ ...authStore, model: user })
      // })
    })
  }

  const createInstanceBackupJob = safeCatch(
    `createInstanceBackupJob`,
    async (instanceId: InstanceId) => {
      const _user = user()
      assertExists(_user, `Expected user to exist here`)
      const { id: userId } = _user
      const job: JobRecord_In<InstanceBackupJobPayload> = {
        userId,
        status: JobStatus.New,
        payload: {
          cmd: JobCommands.BackupInstance,
          instanceId
        }
      }
      const rec = await client.collection('jobs').create<InstanceBackupJobRecord>(job)
      return rec
    }
  )

  const [onJobUpdated, fireJobUpdated] =
    createGenericSyncEvent<RecordSubscription<JobRecord<any>>>()

  client.collection('jobs').subscribe<JobRecord<InstanceBackupJobPayload>>('*', fireJobUpdated)

  return {
    getAuthStoreProps,
    parseError,
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
    resendVerificationEmail,
    watchBackupsByInstanceId,
    onJobUpdated,
    createInstanceBackupJob
  }
}
