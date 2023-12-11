import {
  SubscriptionType,
  UserFields,
  type InstanceFields,
  type InstanceId,
} from '$shared'
import { client } from '$src/pocketbase-client'
import { UnsubscribeFunc } from 'pocketbase'
import { writable } from 'svelte/store'
// TODO: Removing this will cause the app to crash
// Theres a reference inside of `createPocketbaseClient.ts` that needs the information that comes from this file
import '../services'

const { onAuthChange } = client()

export const isUserLegacy = writable(false)
export const userSubscriptionType = writable(SubscriptionType.Legacy)
export const isUserLoggedIn = writable(false)
export const isUserFounder = writable(false)
export const isUserVerified = writable(false)
export const isAuthStateInitialized = writable(false)

/**
 * Listen for auth change events. When we get at least one, the auth state is initialized.
 */
onAuthChange((authStoreProps) => {
  const user = authStoreProps.model as UserFields | undefined
  isUserLegacy.set(!!user?.isLegacy)
  isUserFounder.set(!!user?.isFounder)
  userSubscriptionType.set(user?.subscription || SubscriptionType.Free)
  isUserLoggedIn.set(authStoreProps.isValid)
  isUserVerified.set(!!user?.verified)
  isAuthStateInitialized.set(true)
})

// This holds an array of all the user's instances and their data
export const globalInstancesStore = writable<{
  [_: InstanceId]: InstanceFields
}>({})

export const globalInstancesStoreReady = writable(false)

/**
 * Listen for instances
 */
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
