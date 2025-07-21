import { scaleOrdinal } from 'd3-scale'
import { schemeTableau10 } from 'd3-scale-chromatic'
import { writable } from 'svelte/store'

// color scale used in both visualizations
const colorScale = scaleOrdinal(schemeTableau10)

// in the store describe a list of items by name and value

export type CronItem = {
  endpoint: string
  value: string
}

export type CronArray = CronItem[]

// function to sort the input array and add a color according to the sorted values
function formatInput(input: CronArray): CronArray {
  return input
    .sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1))
    .map(({ endpoint, value }) => ({
      endpoint,
      value,
    }))
}

const sanitize = (item: CronItem) => {
  return {
    endpoint: item.endpoint.trim(),
    value: item.value.trim(),
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
      const { endpoint, value } = sanitize(item)

      return update((n) => {
        return formatInput([...n.filter((i) => i.endpoint !== endpoint), { endpoint, value }])
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
