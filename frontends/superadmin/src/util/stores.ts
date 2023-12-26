import { type InstanceFields, type InstanceId } from '$shared'
import { client } from '$src/pocketbase-client'
import { writable } from 'svelte/store'
// TODO: Removing this will cause the app to crash
// Theres a reference inside of `createPocketbaseClient.ts` that needs the information that comes from this file
import '../services'

const { onAuthChange } = client()

export const isUserLoggedIn = writable(false)
export const isAuthStateInitialized = writable(false)

/**
 * Listen for auth change events. When we get at least one, the auth state is initialized.
 */
onAuthChange((authStoreProps) => {
  isUserLoggedIn.set(authStoreProps.isValid)
  isAuthStateInitialized.set(true)
})

// This holds an array of all the user's instances and their data
export const globalInstancesStore = writable<{
  [_: InstanceId]: InstanceFields
}>({})

export const globalInstancesStoreReady = writable(false)
