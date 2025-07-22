import { scaleOrdinal } from 'd3-scale'
import { schemeTableau10 } from 'd3-scale-chromatic'
import { type InstanceWebhookCollection, type InstanceWebhookItem } from 'pockethost/common'
import { writable } from 'svelte/store'

// color scale used in both visualizations
const colorScale = scaleOrdinal(schemeTableau10)

// Use the proper types from the schema
export type CronItem = InstanceWebhookItem
export type CronArray = InstanceWebhookCollection

// function to sort the input array and add a color according to the sorted values
function formatInput(input: CronArray): CronArray {
  return input
    .sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1))
    .map(({ endpoint, value, lastFired }) => ({
      endpoint,
      value,
      lastFired,
    }))
}

const sanitize = (item: CronItem) => {
  return {
    endpoint: item.endpoint.trim(),
    value: item.value.trim(),
    lastFired: item.lastFired,
  }
}

// create a custom store fulfilling the CRUD operations
function createItems(initialItems: CronArray) {
  const { subscribe, set, update } = writable(initialItems)

  const api = {
    subscribe,
    clear: () => {
      set([])
    },
    // create: add an object for the item at the end of the store's array
    upsert: (item: CronItem) => {
      const { endpoint, value, lastFired } = sanitize(item)

      return update((n) => {
        return formatInput([...n.filter((i) => i.endpoint !== endpoint), { endpoint, value, lastFired }])
      })
    },

    // delete: remove the item from the array
    delete: (name: string) => {
      return update((n) => {
        const index = n.findIndex((item) => item.endpoint === name)
        n = [...n.slice(0, index), ...n.slice(index + 1)]
        return formatInput(n)
      })
    },
  }

  return api
}

export const items = createItems(formatInput([]))
