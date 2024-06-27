<script lang="ts">
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import { globalInstancesStoreReady } from '$util/stores'
</script>

<UserLoggedIn>
  {#if $globalInstancesStoreReady}
    <slot />
  {/if}
</UserLoggedIn>
