<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  const stats = writable({})

  onMount(async () => {
    try {
      stats.set(((await client().client.collection('stats').getFullList()) || []).pop() || {})
    } catch (e) {
      console.error(e)
    }
  })
</script>

<svelte:head>
  <title>Stats - PocketHost</title>
</svelte:head>


<div class="mx-auto my-8">
  <h1 class="text-3xl font-bold text-white mb-8 text-center tracking-tight">Stats</h1>
  <!-- Stats Sections -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- New Instances -->
    <div class="bg-black/50 rounded-lg shadow-md p-5 border border-white/10 hover:bg-black/60 transition-all duration-200 transform hover:-translate-y-1">
      <h2 class="text-lg font-semibold text-white mb-3">New Instances</h2>
      <div class="space-y-2">
        {#each Object.entries($stats) as [key, value]}
          {#if key.includes('new_instances_last')}
            <p class="text-sm text-gray-200"><span class="font-medium text-blue-200">{key.replace('new_instances_last_', '').replace('_', ' ')}:</span> {value}</p>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Total Instances -->
    <div class="bg-black/50 rounded-lg shadow-md p-5 border border-white/10 hover:bg-black/60 transition-all duration-200 transform hover:-translate-y-1">
      <h2 class="text-lg font-semibold text-white mb-3">Total Instances</h2>
      <div class="space-y-2">
        {#each Object.entries($stats) as [key, value]}
          {#if key.includes('total_instances') && !key.includes('last')}
            <p class="text-sm text-gray-200"><span class="font-medium text-blue-200">All Time:</span> {value}</p>
          {/if}
          {#if key.includes('total_instances_last')}
            <p class="text-sm text-gray-200"><span class="font-medium text-blue-200">{key.replace('total_instances_last_', '').replace('_', ' ')}:</span> {value}</p>
          {/if}
        {/each}
      </div>
    </div>

    <!-- New Users -->
    <div class="bg-black/50 rounded-lg shadow-md p-5 border border-white/10 hover:bg-black/60 transition-all duration-200 transform hover:-translate-y-1">
      <h2 class="text-lg font-semibold text-white mb-3">New Users</h2>
      <div class="space-y-2">
        {#each Object.entries($stats) as [key, value]}
          {#if key.includes('new_users_last')}
            <p class="text-sm text-gray-200"><span class="font-medium text-blue-200">{key.replace('new_users_last_', '').replace('_', ' ')}:</span> {value}</p>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Subscribers -->
    <div class="bg-black/50 rounded-lg shadow-md p-5 border border-white/10 hover:bg-black/60 transition-all duration-200 transform hover:-translate-y-1">
      <h2 class="text-lg font-semibold text-white mb-3">Subscribers</h2>
      <div class="space-y-2">
        {#each Object.entries($stats) as [key, value]}
          {#if key.includes('total_free_subscribers') || key.includes('total_pro_') || key.includes('total_founder_subscribers') || key.includes('total_flounder_subscribers')}
            <p class="text-sm text-gray-200"><span class="font-medium text-blue-200">{key.replace('total_', '').replace('_', ' ')}:</span> {value}</p>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Total Users -->
    <div class="bg-black/50 rounded-lg shadow-md p-5 border border-white/10 hover:bg-black/60 transition-all duration-200 transform hover:-translate-y-1">
      <h2 class="text-lg font-semibold text-white mb-3">Total Users</h2>
      <div class="space-y-2">
        {#each Object.entries($stats) as [key, value]}
          {#if key === 'total_users'}
            <p class="text-sm text-gray-200"><span class="font-medium text-blue-200">All Time:</span> {value}</p>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

