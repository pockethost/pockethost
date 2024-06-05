import type { InstanceFields } from '$shared'
import { writable } from 'svelte/store'

export const instance = writable<InstanceFields>()
