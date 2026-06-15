<script lang="ts">
  /** @deprecated Use FeatureTab instead */
  export let documentation: string = ''
</script>

{#if documentation}
  <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
    <h2 class="text-xl font-bold text-white"><slot /></h2>

    <wa-button href={documentation} variant="brand" size="small" appearance="outline" target="_blank">
      Full documentation
      <wa-icon slot="end" name="arrow-up-right-from-square" class="opacity-50 text-sm"></wa-icon>
    </wa-button>
  </div>
{/if}

{#if !documentation}
  <h2 class="text-xl font-bold text-white mb-6">
    <slot />
  </h2>
{/if}
