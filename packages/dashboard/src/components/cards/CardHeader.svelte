<script lang="ts">
  import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  export let documentation: string = ''
</script>

{#if documentation}
  <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
    <h3 class="text-xl font-bold"><slot /></h3>

    <a href={documentation} class="btn btn-sm btn-outline btn-primary" target="_blank"
      >Full documentation <Fa icon={faArrowUpRightFromSquare} class="opacity-50 text-sm" /></a
    >
  </div>
{/if}

{#if !documentation}
  <h3 class="text-xl font-bold mb-4">
    <slot />
  </h3>
{/if}
