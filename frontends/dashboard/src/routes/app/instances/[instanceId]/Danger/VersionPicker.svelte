<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { createEventDispatcher, onMount } from 'svelte'

  // Props definition with default value if needed
  export let selectedVersion: string = ''
  export let disabled: boolean = false

  let versions: string[] = [] // This will hold our version strings

  // Function to fetch versions - replace with your actual fetch logic
  async function fetchVersions(): Promise<string[]> {
    const { versions } = await client().client.send(`/api/versions`, {})
    return versions
  }

  onMount(() => {
    fetchVersions()
      .then((fetchedVersions) => {
        versions = fetchedVersions
      })
      .catch((error) => {
        console.error('Failed to load versions', error)
      })
  })

  // Emit an update when the selection changes
  function handleSelect(event: Event) {
    const detail = (event.target as HTMLSelectElement).value
    selectedVersion = detail // Update the local selected version
    dispatch('change', detail)
  }

  // Create a dispatcher for custom events
  const dispatch = createEventDispatcher()
</script>

<select
  class="select w-full max-w-xs"
  bind:value={selectedVersion}
  on:change={handleSelect}
  {disabled}
>
  <option value="" disabled>Select a version</option>
  {#each versions as version}
    <option value={version}>{version}</option>
  {/each}
</select>
