<script lang="ts">
  import { slide } from 'svelte/transition'

  export let message = ''
</script>

{#if message}
  <div in:slide>
    <wa-callout variant="danger" class="mb-4">
      <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
      {message}
    </wa-callout>
  </div>
{/if}
