<script lang="ts">
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import { type InstanceFields } from 'pockethost/common'
  import InstanceCard from './InstanceCard.svelte'
  import { page } from '$app/state'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'

  type SortOptions = 'subdomain' | 'created' | 'power'
  type SortDirection = 'asc' | 'desc'

  let sortBy: SortOptions = 'power'
  let searchQuery = ''
  let filterPower: 'all' | 'on' | 'off' = 'all'
  let sortDirection: SortDirection = 'asc'

  const updateStateFromUrl = () => {
    const params = page.url.searchParams
    sortDirection = (params.get('sort') as SortDirection) || 'asc'
    sortBy = (params.get('by') as SortOptions) || 'power'
    filterPower = (params.get('f') as 'all' | 'on' | 'off') || 'all'
    searchQuery = params.get('q') || ''
  }
  onMount(() => {
    updateStateFromUrl()
  })

  const updateUrl = () => {
    const params = new URLSearchParams()
    if (sortDirection) params.set('sort', sortDirection)
    if (sortBy) params.set('by', sortBy)
    if (filterPower) params.set('f', filterPower)
    if (searchQuery) params.set('q', searchQuery)
    goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true })
  }

  $: if (sortBy || sortDirection || searchQuery || filterPower) {
    updateUrl()
  }

  const sortFn = (type: SortOptions, direction: SortDirection) => {
    const multiplier = direction === 'asc' ? 1 : -1
    switch (type) {
      case 'subdomain':
        return (a: InstanceFields, b: InstanceFields) => a.subdomain.localeCompare(b.subdomain) * multiplier
      case 'power':
        return (a: InstanceFields, b: InstanceFields) => (a.power === b.power ? 0 : a.power ? -1 : 1) * multiplier
      default:
        return (a: InstanceFields, b: InstanceFields) => b.created.localeCompare(a.created) * multiplier
    }
  }

  const toggleSortDirection = () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
  }

  $: filteredInstances = values($globalInstancesStore)
    .filter((instance) => {
      const target = (instance.cname || instance.subdomain).toLowerCase()
      const matchesQuery = target.includes(searchQuery.toLowerCase())
      const matchesPower = filterPower === 'all' ? true : filterPower === 'on' ? instance.power : !instance.power
      return matchesQuery && matchesPower
    })
    .sort(sortFn(sortBy, sortDirection))
</script>

<div class="flex flex-wrap items-center gap-3 mb-2 bg-gradient-to-r bg-[#111111]/0 rounded-xl relative z-10">
  <div
    class="flex items-center gap-2 w-full md:w-72 rounded-lg px-3 py-2 border border-white/10 focus-within:border-primary transition"
  >
    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M5 11a6 6 0 1112 0 6 6 0 01-12 0z" />
    </svg>
    <input
      type="text"
      placeholder="Search "
      bind:value={searchQuery}
      class="bg-transparent text-white placeholder-slate-400 focus:outline-none w-full"
    />
  </div>

  <div class="flex flex-1 justify-start md:justify-end gap-2">
    <wa-dropdown placement="bottom-end">
      <wa-button slot="trigger" variant="neutral" size="small" appearance="outline">
        Filter: {filterPower === 'all' ? 'All' : filterPower === 'on' ? 'Power On' : 'Power Off'}
      </wa-button>
      <wa-dropdown-item>
        <button type="button" onclick={() => (filterPower = 'all')}>All</button>
      </wa-dropdown-item>
      <wa-dropdown-item>
        <button type="button" onclick={() => (filterPower = 'on')}>Power On</button>
      </wa-dropdown-item>
      <wa-dropdown-item>
        <button type="button" onclick={() => (filterPower = 'off')}>Power Off</button>
      </wa-dropdown-item>
    </wa-dropdown>

    <wa-dropdown placement="bottom-end">
      <wa-button slot="trigger" variant="neutral" size="small" appearance="outline">
        Sort: {sortBy}
      </wa-button>
      <wa-dropdown-item>
        <button type="button" onclick={() => (sortBy = 'power')}>Power</button>
      </wa-dropdown-item>
      <wa-dropdown-item>
        <button type="button" onclick={() => (sortBy = 'subdomain')}>Subdomain</button>
      </wa-dropdown-item>
      <wa-dropdown-item>
        <button type="button" onclick={() => (sortBy = 'created')}>Created</button>
      </wa-dropdown-item>
    </wa-dropdown>

    <wa-button variant="neutral" size="small" appearance="outline" onclick={toggleSortDirection}>
      <wa-icon name={sortDirection === 'desc' ? 'arrow-down-z-a' : 'arrow-down-a-z'}></wa-icon>
    </wa-button>
  </div>
</div>

<div
  class="min-h-[50vh] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-min pt-1 md:pt-3 gap-2 md:gap-4 items-start justify-start relative z-0"
>
  {#each filteredInstances as instance (instance.id)}
    <InstanceCard {instance} />
  {/each}
</div>
