import { writable } from 'svelte/store'

export const globalUserData = writable({})
export const isUserLoggedIn = writable(false)
export const isUserVerified = writable(false)

// Update some derived stores based on the logged-in state of the user
globalUserData.subscribe((data) => {
  // Check if the email property exists
  if (data?.user?.email) {
    isUserLoggedIn.set(true)
  } else {
    isUserLoggedIn.set(false)
  }

  // Check if the user has verified their email
  if (data?.user?.verified) {
    isUserVerified.set(true)
  } else {
    isUserVerified.set(false)
  }
})
