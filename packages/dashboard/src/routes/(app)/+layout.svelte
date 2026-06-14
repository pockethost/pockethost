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
    <div class="flex flex-col items-center justify-center py-16 md:py-24 text-center">
      <div
        class="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5"
      >
        <wa-icon name="lock" class="text-xl text-neutral-400"></wa-icon>
      </div>
      <h2 class="mb-2 text-lg font-semibold text-white">Sign in required</h2>
      <p class="mb-6 max-w-sm text-sm text-neutral-400">
        Log in to manage your PocketBase instances and account settings.
      </p>
      <wa-button href="/login" variant="brand">Log in</wa-button>
      <p class="mt-4 text-sm text-neutral-500">
        No account?
        <a href="/get-started" class="text-primary hover:text-secondary hover:underline">Get started</a>
      </p>
    </div>
  </UserLoggedOut>
</div>
