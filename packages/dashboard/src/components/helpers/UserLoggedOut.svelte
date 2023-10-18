<script lang="ts">
  import { isUserLoggedIn } from '$util/stores'
  import AuthStateGuard from './AuthStateGuard.svelte'
</script>

<AuthStateGuard>
  {#if !$isUserLoggedIn}
    <slot />
  {/if}
</AuthStateGuard>
