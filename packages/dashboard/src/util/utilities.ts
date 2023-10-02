import { page as pageStore } from '$app/stores'
import { get } from 'svelte/store'

export const getRandomElementFromArray = (array: string[]) => {
  return array[Math.floor(Math.random() * array.length)]
}

// This returns an object with the current URL information
export const getRouter = () => {
  const router = get(pageStore)
  return router.url
}
