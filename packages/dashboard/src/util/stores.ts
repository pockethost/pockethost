import { client } from '$src/pocketbase'
import {
  LoggerService,
  type InstanceFields,
  type InstanceId,
} from '@pockethost/common'
import { UnsubscribeFunc } from 'pocketbase'
import { writable } from 'svelte/store'
import '../services'

export const isUserLoggedIn = writable(false)
export const isUserVerified = writable(false)
export const isAuthStateInitialized = writable(false)

const { onAuthChange } = client()

/**
 * Listen for auth change events. When we get at least one, the auth state is initialized.
 */
onAuthChange((authStoreProps) => {
  const { dbg } = LoggerService()
  dbg(`onAuthChange in store`, { ...authStoreProps })
  isUserLoggedIn.set(authStoreProps.isValid)
  isUserVerified.set(!!authStoreProps.model?.verified)
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
