<script>
  import MediaQuery from '$components/MediaQuery.svelte'
  import MobileNavDrawer from '$components/MobileNavDrawer.svelte'
  import Navbar from '$components/Navbar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import '../app.css'
</script>

<Meta />

<AuthStateGuard>
  <div class="layout xl:flex">
    <UserLoggedIn>
      <MediaQuery query="(min-width: 1280px)" let:matches>
        {#if matches}
          <Navbar />
        {:else}
          <MobileNavDrawer>
            <Navbar />
          </MobileNavDrawer>
        {/if}
      </MediaQuery>
    </UserLoggedIn>

    <div class="lg:p-4 lg:pt-0 xl:pt-4 min-h-screen grow">
      <div class="bg-base-300 border-base-300 border-[16px] lg:p-4 rounded-2xl">
        <slot />
      </div>
    </div>
  </div>
</AuthStateGuard>
