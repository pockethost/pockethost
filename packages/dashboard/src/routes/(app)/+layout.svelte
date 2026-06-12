<script>
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import { userStore } from '$util/stores'

  $: maxInstances = $userStore?.subscription_quantity
</script>

<div class="px-4 md:px-20 relative z-10 max-w-content mx-auto">
  <UserLoggedIn>
    {#if maxInstances === 0}
      <wa-callout variant="warning" class="py-2 mt-2">
        <span class="flex-1 text-sm flex text-white text-start items-center justify-start gap-4">
          Instances will not run until you upgrade.
        </span>
        <wa-button slot="actions" href="/access" variant="neutral" size="small" appearance="outline" aria-label="Upgrade">
          Upgrade
        </wa-button>
      </wa-callout>
    {/if}
    <slot />
  </UserLoggedIn>
  <UserLoggedOut>
    <p>
      You must be <a href="/login" class="text-primary">logged in</a> to access this area.
    </p>
  </UserLoggedOut>
</div>
