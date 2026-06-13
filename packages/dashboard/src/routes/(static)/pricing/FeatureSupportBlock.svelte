<script lang="ts">
  export let item: string
</script>

<td class="px-4 py-0 text-center">
  <div class="relative h-full w-full py-3 flex justify-center">
    <span>
      {#if item === 'YesBlock'}
        <wa-icon name="check" class="text-primary"></wa-icon>
      {:else if item === 'NoBlock'}
        <wa-icon name="xmark" class="text-error"></wa-icon>
      {:else}
        {@html item}
      {/if}
    </span>
  </div>
</td>
