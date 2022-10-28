import type { User } from 'pocketbase';
import { writable } from 'svelte/store'

type PocketbaseUser = {
  user: User,
  token: string,
}

export const globalUserData = writable<PocketbaseUser>()
export const isUserLoggedIn = writable<boolean>(false)
export const isUserVerified = writable<boolean>(false)

// Update some derived stores based on the logged-in state of the user
globalUserData.subscribe((data) => {
  // Check if the email property exists
  isUserLoggedIn.set(!!data?.user?.email)

  // Check if the user has verified their email
  isUserVerified.set(!!data?.user?.verified)
})
