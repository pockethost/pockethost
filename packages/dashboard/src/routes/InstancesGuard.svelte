<script lang="ts">
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import { globalInstancesStoreReady } from '$util/stores'

  $: isReady = $globalInstancesStoreReady
</script>

<UserLoggedIn>
  {#if isReady}
    <slot />
  {/if}
</UserLoggedIn>
