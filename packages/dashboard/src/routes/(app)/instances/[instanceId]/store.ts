import type { InstanceFields } from '@pockethost/server/common'
import { writable } from 'svelte/store'

export const instance = writable<InstanceFields>()
