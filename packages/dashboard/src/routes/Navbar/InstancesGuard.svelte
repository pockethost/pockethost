<script lang="ts">
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import { globalInstancesStoreReady } from '$util/stores'
</script>

<UserLoggedIn>
  {#if $globalInstancesStoreReady}
    <slot />
  {/if}
</UserLoggedIn>
