<script lang="ts">
  import { isAuthStateInitialized } from '$util/stores'
</script>

{#if $isAuthStateInitialized}
  <slot />
{/if}
