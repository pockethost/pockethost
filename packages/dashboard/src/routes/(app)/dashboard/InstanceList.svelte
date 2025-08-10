<script lang="ts">
  import { goto } from '$app/navigation'
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
  import { values } from '@s-libs/micro-dash'
  import { type InstanceId } from 'pockethost/common'
  import Fa from 'svelte-fa'
  import { type InstanceFields } from 'pockethost/common'

  type SortOptions = 'subdomain' | 'created' | 'power'

  let sortBy: SortOptions = 'power'
  let searchQuery = ''
  let filterPower: 'all' | 'on' | 'off' = 'all'

  const { updateInstance } = client()

  const handlePowerChange = (id: InstanceId) => (e: Event) => {
    const target = e.target as HTMLInputElement
    const power = target.checked
    updateInstance({ id, fields: { power } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }

  const sortFn = (type: SortOptions) => {
    switch (type) {
      case 'subdomain':
        return (a: InstanceFields, b: InstanceFields) => a.subdomain.localeCompare(b.subdomain)
      case 'power':
        return (a: InstanceFields, b: InstanceFields) => a.power === b.power ? 0 : a.power ? -1 : 1
      default:
        return (a: InstanceFields, b: InstanceFields) => b.created.localeCompare(a.created)
    }
  }

  $: filteredInstances = values($globalInstancesStore)
    .filter((instance) =>
      instance.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((instance) =>
      filterPower === 'all' ? true : filterPower === 'on' ? instance.power : !instance.power
    )
    .sort(sortFn(sortBy))
</script>

<div class="flex flex-wrap items-center gap-3 mb-2 bg-gradient-to-r bg-[#111111]/0 rounded-xl relative z-10">
  
  <div class="flex items-center gap-2 min-w-64 rounded-lg px-3 py-2 border border-white/10 focus-within:border-primary transition">
    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M5 11a6 6 0 1112 0 6 6 0 01-12 0z" />
    </svg>
    <input
      type="text"
      placeholder="Search by subdomain..."
      bind:value={searchQuery}
      class="bg-transparent text-white placeholder-slate-400 focus:outline-none w-full"
    />
  </div>

  <div class="flex flex-1 justify-end gap-2">
    <div class="dropdown dropdown-end ">
    <div tabindex="0" role="button" class="btn btn-sm text-white border border-white/10 hover:border-primary">
      Filter: {filterPower === 'all' ? 'All' : filterPower === 'on' ? 'Power On' : 'Power Off'}
    </div>
    <ul tabindex="0" class="dropdown-content menu bg-base-300 rounded-box mt-2 w-40 p-2 shadow">
      <li><button on:click={() => filterPower = 'all'}>All</button></li>
      <li><button on:click={() => filterPower = 'on'}>Power On</button></li>
      <li><button on:click={() => filterPower = 'off'}>Power Off</button></li>
    </ul>
  </div>

  <div class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="btn btn-sm text-white border border-white/10 hover:border-primary">
      Sort: {sortBy}
    </div>
    <ul tabindex="0" class="dropdown-content menu bg-base-300 rounded-box z-[100] mt-2 w-40 p-2 shadow">
      <li><button on:click={() => sortBy = 'power'}>Power</button></li>
      <li><button on:click={() => sortBy = 'subdomain'}>Subdomain</button></li>
      <li><button on:click={() => sortBy = 'created'}>Created</button></li>
    </ul>
  </div>
  </div>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-3 gap-4 items-center justify-center relative z-0">

{#each filteredInstances as instance}
  <button
    class={`card flex-1 transition border border-white/10 ${instance.power ? 'hover:border-green-400/60' : 'hover:border-red-400/60'} hover:bg-black/50 rounded-xl shadow-md overflow-hidden 
      ${instance.power ? 'bg-black/40' : 'bg-black/40'}`}
    on:click={() => goto(`/instances/${instance.id}`)}
  >
    <div class="card-body w-full flex flex-row items-center justify-between gap-6">
      <div class="flex flex-col items-start gap-2">
        <span class="text-xl font-semibold truncate max-w-[200px]">
          {instance.subdomain} 
        </span>

        <div class="flex flex-wrap gap-1">
          <a
            href={INSTANCE_ADMIN_URL(instance)}
            target="_blank"
            on:click={(e) => e.stopPropagation()}
            class="pr-2 py-0.5 rounded-full text-xs font-medium flex gap-2"
            title="Open Admin"
          >
            <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="w-4 h-4" /> Admin
          </a>
          <p
            class={`px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border-gray-500/30`}
          >
            <span>v{instance.version}</span>
          </p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3">
        <input
          type="checkbox"
          class={`toggle ${instance.power ? 'toggle-success' : 'bg-red-500 hover:bg-red-500'}`}
          checked={instance.power}
          on:click={(e) => e.stopPropagation()}
          on:change={handlePowerChange(instance.id)}
        />
      </div>
    </div>
  </button>
{/each}
</div>


