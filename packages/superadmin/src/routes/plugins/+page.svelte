<script lang="ts">
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

  onMount(async () => {
    try {
      plugins.set(await client().client.collection('plugins').getFullList())
    } catch (e) {
      console.error(e)
    }
  })
</script>

<svelte:head>
  <title>Stats - PocketHost</title>
</svelte:head>

<div>
  {#each $plugins as plugin}
    <div>{plugin.name}</div>
  {/each}
</div>
