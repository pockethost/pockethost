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

<div class="m-10">
  <div class="text-xl">Stats</div>
  <table>
    {#each Object.entries($stats) as [key, idx]}
      <tr>
        <td>{key}</td>
        <td>{idx}</td>
      </tr>
    {/each}
  </table>
</div>
