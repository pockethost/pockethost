import type { InstanceFields } from '@pockethost/common'
import { writable } from 'svelte/store'

export const instance = writable<InstanceFields>()
