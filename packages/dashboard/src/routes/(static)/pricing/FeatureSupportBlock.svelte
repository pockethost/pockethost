<script lang="ts">
  import Fa from 'svelte-fa'
  import { faCheck, faX } from '@fortawesome/free-solid-svg-icons'

  export let item: string
</script>

<td class=" px-4 py-0 text-center">
  <div class="relative h-full w-full py-3 flex justify-center">
    <span>
      {#if item === 'YesBlock'}
        <Fa icon={faCheck} class="text-primary" />
      {:else if item === 'NoBlock'}
        <Fa icon={faX} class="text-error" />
      {:else}
        {@html item}
      {/if}
    </span>
  </div>
</td>
