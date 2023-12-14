<script lang="ts">
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import { client } from '$src/pocketbase-client'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  type Plugin = {
    slug: string
    name: string
    version: string
    migration: number
    enabled: boolean
  }

  const plugins = writable<Plugin[]>([])
  const stats = writable({})

  onMount(async () => {
    plugins.set(await client().client.collection('plugins').getFullList())
    stats.set(
      ((await client().client.collection('stats').getFullList()) || []).pop() ||
        {},
    )
  })
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<AuthStateGuard>
  <div>
    {#each Object.entries($stats) as [key, idx]}
      <div>{key}: {idx}</div>
    {/each}
  </div>
  <div>
    {#each $plugins as plugin}
      <div>{plugin.name}</div>
    {/each}
  </div>
</AuthStateGuard>
