<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  // Props definition with default value if needed
  export let versions: string[]
  export let selectedVersion: string = ''
  export let disabled: boolean = false

  // Emit an update when the selection changes
  function handleSelect(event: Event) {
    const detail = (event.target as HTMLSelectElement).value
    selectedVersion = detail // Update the local selected version
    dispatch('change', detail)
  }

  // Create a dispatcher for custom events
  const dispatch = createEventDispatcher()
</script>

<select class="select select-bordered w-full" bind:value={selectedVersion} on:change={handleSelect} {disabled}>
  <option value="" disabled>Select a version</option>
  {#each versions as version}
    <option value={version}>{version}</option>
  {/each}
</select>
