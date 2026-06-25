<script lang="ts">
  import { writable } from 'svelte/store'

  export let item: any
  export let enlarge = false

  const showInfo = writable(false)
  const handleInfoClick = () => {
    showInfo.update((value) => !value)
  }
</script>

<td class="py-3 pr-4 text-left text-neutral-content leading-6">
  <div>
    <span class="flex-shrink-0">{item.name}</span>
    {#if item.isNew}
      <wa-badge variant="brand" class="ml-2">new</wa-badge>
    {/if}
    {#if item.info}
      <wa-button variant="neutral" size="s" class="ml-2" onclick={handleInfoClick}>
        <wa-icon name="circle-info"></wa-icon>
      </wa-button>
    {/if}
  </div>

  {#if $showInfo}
    <div class={`text-neutral-content font-normal ${enlarge ? 'text-md' : 'text-sm'}`}>
      {item.info}
    </div>
  {/if}
</td>
