import { type TrustedIpEntry } from 'pockethost/common'
import { writable } from 'svelte/store'

function formatInput(input: TrustedIpEntry[]): TrustedIpEntry[] {
  return input
    .slice()
    .sort((a, b) => a.cidr.localeCompare(b.cidr))
    .map(({ cidr, label }) => ({
      cidr,
      ...(label ? { label } : {}),
    }))
}

const sanitize = (item: TrustedIpEntry): TrustedIpEntry => ({
  cidr: item.cidr.trim(),
  ...(item.label?.trim() ? { label: item.label.trim() } : {}),
})

function createItems(initialItems: TrustedIpEntry[]) {
  const { subscribe, set, update } = writable(initialItems)

  return {
    subscribe,
    clear: () => set([]),
    upsert: (item: TrustedIpEntry) => {
      const next = sanitize(item)
      return update((n) => formatInput([...n.filter((i) => i.cidr !== next.cidr), next]))
    },
    delete: (cidr: string) => {
      return update((n) => formatInput(n.filter((item) => item.cidr !== cidr)))
    },
    setAll: (items: TrustedIpEntry[]) => set(formatInput(items)),
  }
}

export const trustedItems = createItems([])
export const proxyItems = createItems([])
