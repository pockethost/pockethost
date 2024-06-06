import { client } from '$src/pocketbase-client'
import consoleLogger from '@pockethost/plugin-console-logger'
import {
  SubscriptionType,
  UserFields,
  loadPlugins,
  type InstanceFields,
  type InstanceId,
  type UnsubscribeFunc,
} from 'pockethost'
import { writable } from 'svelte/store'
// TODO: Removing this will cause the app to crash
// Theres a reference inside of `createPocketbaseClient.ts` that needs the information that comes from this file
import '../services'

loadPlugins([consoleLogger])

const { onAuthChange } = client()

export const isUserLegacy = writable(false)
export const userSubscriptionType = writable(SubscriptionType.Legacy)
export const isUserLoggedIn = writable(false)
export const isUserFounder = writable(false)
export const isUserVerified = writable(false)
export const isAuthStateInitialized = writable(false)
export const userStore = writable<UserFields | undefined>()
/**
 * Listen for auth change events. When we get at least one, the auth state is
 * initialized.
 */
onAuthChange((authStoreProps) => {
  const isLoggedIn = authStoreProps.isValid
  isUserLoggedIn.set(isLoggedIn)
  userStore.set(isLoggedIn ? (authStoreProps.model as UserFields) : undefined)
  isAuthStateInitialized.set(true)
})

userStore.subscribe((user) => {
  isUserLegacy.set(!!user?.isLegacy)
  isUserFounder.set(!!user?.isFounder)
  userSubscriptionType.set(user?.subscription || SubscriptionType.Free)
  isUserVerified.set(!!user?.verified)
})

// This holds an array of all the user's instances and their data
export const globalInstancesStore = writable<{
  [_: InstanceId]: InstanceFields
}>({})

export const globalInstancesStoreReady = writable(false)

/** Listen for instances */
isUserLoggedIn.subscribe(async (isLoggedIn) => {
  let unsub: UnsubscribeFunc | undefined
  if (!isLoggedIn) {
    globalInstancesStore.set({})
    globalInstancesStoreReady.set(false)
    unsub?.()
      .then(() => {
        unsub = undefined
      })
      .catch(console.error)
    return
  }
  const { getAllInstancesById } = client()

  const instances = await getAllInstancesById()

  globalInstancesStore.set(instances)
  globalInstancesStoreReady.set(true)

  client()
    .client.collection('instances')
    .subscribe<InstanceFields>('*', (data) => {
      globalInstancesStore.update((instances) => {
        instances[data.record.id] = data.record
        return instances
      })
    })
    .then((u) => (unsub = u))
    .catch(console.error)
})
