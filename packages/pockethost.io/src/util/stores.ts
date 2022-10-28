import type { User } from 'pocketbase'
import { client } from '$src/pocketbase'
import {get, writable} from 'svelte/store'

const { onAuthChange } = client;

type UserAuthResponse = {
  user: User
  token: string
}

export const globalUserData = writable<UserAuthResponse>()
export const isUserLoggedIn = writable<boolean>(false)
export const isUserVerified = writable<boolean>(false)

// Update some derived stores based on the logged-in state of the user
globalUserData.subscribe((data) => {
  // Check if the email property exists
  isUserLoggedIn.set(!!data?.user?.email)

  // Check if the user has verified their email
  isUserVerified.set(!!data?.user?.verified)
})

// Watch for any realtime changes with the DB and update the `globalUserData` store
onAuthChange((newUserProfileData) => {
  // Get the current info and model
  const currentUserData = get(globalUserData);

  // Create a new object with the updated user profile data from Pocketbase
  const updateValues = {
    ...currentUserData,
    user: <User>newUserProfileData.model
  };

  // Update the global store
  globalUserData.set(updateValues);
})