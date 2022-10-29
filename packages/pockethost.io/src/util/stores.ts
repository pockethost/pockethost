import { browser } from '$app/environment'
import { client } from '$src/pocketbase'
import type { AuthStoreProps } from '$src/pocketbase/PocketbaseClient'
import { writable } from 'svelte/store'

export const authStoreState = writable<AuthStoreProps>({ isValid: false, model: null, token: '' })
export const isUserLoggedIn = writable(false)
export const isUserVerified = writable(false)

if (browser) {
  console.log(`inside browser`)
  const { onAuthChange } = client()
  // Watch for any realtime changes with the DB and update the `globalUserData` store
  onAuthChange((authStoreProps) => {
    console.log(`onAuthChange in store`, { ...authStoreProps })
    authStoreState.set(authStoreProps)
  })

  // Update derived stores when authStore changes
  authStoreState.subscribe((authStoreProps) => {
    console.log(`subscriber change`, authStoreProps)
    isUserLoggedIn.set(authStoreProps.isValid)
    isUserVerified.set(!!authStoreProps.model?.verified)
  })
}
