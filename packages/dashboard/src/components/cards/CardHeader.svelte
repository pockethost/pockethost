<script lang="ts">
  export let documentation: string = ''
</script>

{#if documentation}
  <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
    <h2 class="text-2xl font-bold"><slot /></h2>

    <a
      href={documentation}
      class="btn btn-sm btn-outline btn-primary"
      target="_blank"
      >Full documentation <i
        class="fa-regular fa-arrow-up-right-from-square opacity-50 text-sm"
      ></i></a
    >
  </div>
{/if}

{#if !documentation}
  <h2 class="text-2xl font-bold mb-4">
    <slot />
  </h2>
{/if}
