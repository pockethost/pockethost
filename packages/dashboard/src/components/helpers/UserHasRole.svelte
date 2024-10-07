<script lang="ts">
  import {
    isAuthStateInitialized,
    isUserLoggedIn,
    userStore,
  } from '$util/stores'
  import AuthStateGuard from './AuthStateGuard.svelte'

  export let role = ''
  let hasRole = false
  $: {
    if ($isAuthStateInitialized && $isUserLoggedIn) {
      switch (role) {
        case 'stats':
          hasRole = !!$userStore?.isStatsRole
          break
      }
    }
  }
</script>

{#if hasRole}
  <slot />
{/if}
