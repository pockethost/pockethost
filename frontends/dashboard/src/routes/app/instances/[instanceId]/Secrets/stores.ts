import { scaleOrdinal } from 'd3-scale'
import { schemeTableau10 } from 'd3-scale-chromatic'
import { writable } from 'svelte/store'

// color scale used in both visualizations
const colorScale = scaleOrdinal(schemeTableau10)

// in the store describe a list of items by name and value

export type SecretItem = {
  name: string
  value: string
  color?: string
}

export type SecretsArray = SecretItem[]

// function to sort the input array and add a color according to the sorted values
function formatInput(input: SecretsArray): SecretsArray {
  return input
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .map(({ name, value }, index) => ({
      name,
      value,
      color: colorScale(index.toString()),
    }))
}

const sanitize = (item: SecretItem) => {
  return {
    name: item.name.toUpperCase().trim(),
    value: item.value.trim(),
  }
}

// create a custom store fulfilling the CRUD operations
function createItems(initialItems: SecretsArray) {
  const { subscribe, set, update } = writable(initialItems)

  const api = {
    subscribe,
    clear: () => {
      set([])
    },
    // create: add an object for the item at the end of the store's array
    upsert: (item: SecretItem) => {
      const { name, value } = sanitize(item)

      return update((n) => {
        return formatInput([
          ...n.filter((i) => i.name !== name),
          { name, value },
        ])
      })
    },

    // delete: remove the item from the array
    delete: (name: string) => {
      return update((n) => {
        const index = n.findIndex((item) => item.name === name)
        n = [...n.slice(0, index), ...n.slice(index + 1)]
        return formatInput(n)
      })
    },
  }

  return api
}

export const items = createItems(formatInput([]))
