<script lang="ts">
  import { isUserLoggedIn } from '$util/stores'
</script>

{#if !$isUserLoggedIn}
  <slot />
{/if}
