<script lang="ts">
  import MediaQuery from '$components/MediaQuery.svelte'
  import MobileNavDrawer from '$components/MobileNavDrawer.svelte'
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import { isUserLoggedIn } from '$util/stores'
  import '../app.css'
</script>

<Meta />

<AuthStateGuard>
  <div>
    <UserLoggedIn>
      <MediaQuery query="(max-width: 700px)" let:matches>
        {#if matches}
          <MobileNavDrawer>
            <Navbar />
          </MobileNavDrawer>
        {:else}
          <Navbar />
        {/if}
      </MediaQuery>
    </UserLoggedIn>

    <main class="py-10 {$isUserLoggedIn ? `lg:pl-72` : ``}">
      <div class="px-4 sm:px-6 lg:px-8">
        <VerifyAccountBar />

        <slot />
      </div>
    </main>
  </div>
</AuthStateGuard>
