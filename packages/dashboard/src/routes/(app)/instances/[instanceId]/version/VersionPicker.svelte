<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let versions: string[]
  export let selectedVersion: string = ''
  export let disabled: boolean = false
  /** The instance's saved version; shown as a disabled option when it isn't selectable anymore. */
  export let currentVersion: string = ''

  const dispatch = createEventDispatcher()

  function handleSelect(event: Event) {
    const detail = (event.target as HTMLSelectElement).value
    selectedVersion = detail
    dispatch('change', detail)
  }
</script>

<wa-select
  class="w-full"
  value={selectedVersion}
  oninput={(e: Event) => {
    selectedVersion = (e.target as HTMLSelectElement).value
    handleSelect(e)
  }}
  {disabled}
>
  <wa-option value="" disabled>Select a version</wa-option>
  {#if currentVersion && !versions.includes(currentVersion)}
    <!-- A legacy version the instance is still on, but can no longer be chosen. -->
    <wa-option value={currentVersion} disabled>{currentVersion} (legacy)</wa-option>
  {/if}
  {#each versions as version}
    <wa-option value={version}>{version}</wa-option>
  {/each}
</wa-select>
