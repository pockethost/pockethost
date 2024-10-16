<script lang="ts">
  import { isAuthStateInitialized, isUserLoggedIn } from '$util/stores'

  export let redirect = false
  $: {
    if ($isAuthStateInitialized && redirect && !$isUserLoggedIn) {
      window.location.href = '/get-started'
    }
  }
</script>

{#if $isUserLoggedIn}
  <slot />
{/if}
