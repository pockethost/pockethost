import { browser } from '$app/environment'
import { client } from '$src/pocketbase'
import type { AuthStoreProps } from '$src/pocketbase/PocketbaseClient'
import { logger } from '@pockethost/common'
import { writable } from 'svelte/store'

export const authStoreState = writable<AuthStoreProps>({ isValid: false, model: null, token: '' })
export const isUserLoggedIn = writable(false)
export const isUserVerified = writable(false)
export const isAuthStateInitialized = writable(false)

if (browser) {
  const { onAuthChange } = client()

  /**
   * Listen for auth change events. When we get at least one, the auth state is initialized.
   */
  onAuthChange((authStoreProps) => {
    const { dbg, error, warn } = logger()
    dbg(`onAuthChange in store`, { ...authStoreProps })
    authStoreState.set(authStoreProps)
    isAuthStateInitialized.set(true)
  })

  // Update derived stores when authStore changes
  authStoreState.subscribe((authStoreProps) => {
    const { dbg, error, warn } = logger()
    dbg(`subscriber change`, authStoreProps)
    isUserLoggedIn.set(authStoreProps.isValid)
    isUserVerified.set(!!authStoreProps.model?.verified)
  })
}
