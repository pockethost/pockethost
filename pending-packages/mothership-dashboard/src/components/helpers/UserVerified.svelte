<script lang="ts">
  import { isUserVerified } from '$util/stores'
  import AuthStateGuard from './AuthStateGuard.svelte'
</script>

<AuthStateGuard>
  {#if !$isUserVerified}
    <slot />
  {/if}
</AuthStateGuard>
