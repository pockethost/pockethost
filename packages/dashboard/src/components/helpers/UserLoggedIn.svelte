<script lang="ts">
  import { isAuthStateInitialized, isUserLoggedIn } from '$util/stores'
  import AuthStateGuard from './AuthStateGuard.svelte'

  export let redirect = false
  $: {
    if ($isAuthStateInitialized && redirect && !$isUserLoggedIn) {
      window.location.href = '/get-started'
    }
  }
</script>

<AuthStateGuard>
  {#if $isUserLoggedIn}
    <slot />
  {/if}
</AuthStateGuard>
