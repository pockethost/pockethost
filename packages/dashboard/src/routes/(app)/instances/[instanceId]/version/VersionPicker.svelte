<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { versions as defaultVersions } from '$src/util/stores'

  // Props definition with default value if needed
  export let versions = $defaultVersions
  export let selectedVersion: string = ''
  export let disabled: boolean = false

  const filteredVersions = versions.filter((v) => v.endsWith('*'))

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
  class="select select-bordered w-full"
  bind:value={selectedVersion}
  on:change={handleSelect}
  {disabled}
>
  <option value="" disabled>Select a version</option>
  {#each filteredVersions as version}
    <option value={version}>{version}</option>
  {/each}
</select>
