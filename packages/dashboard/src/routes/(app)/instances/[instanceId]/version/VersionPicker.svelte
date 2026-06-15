<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let versions: string[]
  export let selectedVersion: string = ''
  export let disabled: boolean = false

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
  {#each versions as version}
    <wa-option value={version}>{version}</wa-option>
  {/each}
</wa-select>
