import type { InstanceFields } from 'pockethost'
import { writable } from 'svelte/store'

export const instance = writable<InstanceFields>()
