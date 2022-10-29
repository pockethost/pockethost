<script lang="ts">
  import { isAuthStateInitialized } from '$util/stores'
  import { onMount } from 'svelte'

  onMount(() => {})
</script>

{#if $isAuthStateInitialized}
  <slot />
{/if}
