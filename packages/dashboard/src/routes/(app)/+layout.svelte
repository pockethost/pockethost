<script>
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import { userStore } from '$util/stores'

  $: maxInstances = $userStore?.subscription_quantity
</script>

<div class="m-4">
  <UserLoggedIn>
    {#if maxInstances === 0}
      <div class="flex flex-col space-x-4 items-center justify-center">
        <div class="prose">
          <p class="text-2xl text-center text-warning">
            Instances will not run until you <a
              href="/access"
              class="link text-primary">upgrade</a
            >.
          </p>
        </div>
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
