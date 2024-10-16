<script lang="ts">
  import { isAuthStateInitialized } from '$util/stores'
</script>

{#if $isAuthStateInitialized}
  <slot />
{:else}
  <slot name="loading" />
{/if}
