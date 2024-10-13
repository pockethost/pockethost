<script lang="ts">
  import { faInfo } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'
  import { writable } from 'svelte/store'

  export let item: any
  export let enlarge = false

  const showInfo = writable(false)
  const handleInfoClick = () => {
    showInfo.update((value) => !value)
  }
</script>

<th
  scope="row"
  class={`${enlarge ? "text-md" : "text-sm w-1/4"} py-3 pr-4 text-left text-neutral-content leading-6`}
  colspan={enlarge ? 2 : 1}
>
  <div class="flex items-center">
    <span class="flex-shrink-0">{item.name}</span>
    {#if item.isNew}
      <span class="badge badge-primary ml-2">new</span>
    {/if}
    {#if item.info}
      <button
        class="badge badge-secondary badge-sm ml-2"
        on:click={handleInfoClick}
      >
        <Fa icon={faInfo} />
      </button>
    {/if}
  </div>

  {#if $showInfo}
    <div class={`text-neutral-content font-normal ${enlarge ? "text-md" : "text-sm"}`}>
      {item.info}
    </div>
  {/if}
</th>
