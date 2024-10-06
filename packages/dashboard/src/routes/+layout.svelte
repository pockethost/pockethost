<script lang="ts">
  import MediaQuery from '$components/MediaQuery.svelte'
  import MobileNavDrawer from '$components/MobileNavDrawer.svelte'
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import '../app.css'
</script>

<Meta />

<AuthStateGuard>
  <div>
    <Navbar />

    <main class="">
      <div class="px-4 sm:px-6 lg:px-8">
        <VerifyAccountBar />
        <slot />
      </div>
    </main>
  </div>
</AuthStateGuard>
<div
  class="p-10 text-xs text-neutral-content flex flex-col text-center items-center"
>
  <div class="flex flex-row space-x-5">
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
  </div>
  <div>(c) 2024, PocketHost</div>
  <div>Proudly hacking open source in Reno, NV</div>
</div>
