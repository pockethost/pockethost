import type { InstancesRecord } from '@pockethost/common'
import { writable } from 'svelte/store'

export const instance = writable<InstancesRecord>()
