<script lang="ts">
  import { slide } from 'svelte/transition'

  export let message = ''
</script>

{#if message}
  <div in:slide class="alert alert-error mb-4">
    <i class="fa-regular fa-circle-exclamation"></i>
    {message}
  </div>
{/if}
