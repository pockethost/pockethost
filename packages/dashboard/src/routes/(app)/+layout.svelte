<script>
  import BlurBg from '$components/BlurBg.svelte'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import { userStore } from '$util/stores'

  $: maxInstances = $userStore?.subscription_quantity
</script>

<BlurBg className="opacity-50" />
<div class="px-4 md:px-20 relative z-10">
  <UserLoggedIn>
    {#if maxInstances === 0}
      <div class="alert py-2 mt-2 flex justify-center rounded-md px-4 items-center alert-warning relative">
        <div class=" flex-1 text-sm flex text-white text-start items-center justify-start gap-4">
          Instances will not run until you upgrade.
        </div>
        <a href="/access" class="btn btn-outline-secondary btn-sm hover:bg-yellow-300/20" aria-label="Dismiss banner">
          Upgrade
        </a>
      </div>
    {/if}
    <slot />
  </UserLoggedIn>
  <UserLoggedOut>
    <p>
      You must be <a href="/login" class="link">logged in</a> to access this area.
    </p>
  </UserLoggedOut>
</div>
