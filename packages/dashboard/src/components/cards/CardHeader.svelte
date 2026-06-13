<script lang="ts">
  export let documentation: string = ''
</script>

{#if documentation}
  <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
    <h3 class="text-xl font-bold"><slot /></h3>

    <wa-button href={documentation} variant="brand" size="small" appearance="outline" target="_blank">
      Full documentation
      <wa-icon slot="end" name="arrow-up-right-from-square" class="opacity-50 text-sm"></wa-icon>
    </wa-button>
  </div>
{/if}

{#if !documentation}
  <h3 class="text-xl font-bold mb-4">
    <slot />
  </h3>
{/if}
