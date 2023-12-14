<script>
  import { page } from '$app/stores'
  import Logo from '$components/Logo.svelte'
  import MediaQuery from '$components/MediaQuery.svelte'
  import MobileNavDrawer from '$components/MobileNavDrawer.svelte'
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import { DISCORD_URL, DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import '../app.css'

  const handleLogoutAndRedirect = async () => {
    const { logOut } = client()

    // Clear out the pocketbase information about the current user
    logOut()

    // Hard refresh to make sure any remaining data is cleared
    window.location.href = '/'
  }
</script>

<Meta />

<AuthStateGuard>
  <div class="layout xl:flex">
    <UserLoggedIn>
      <MediaQuery query="(min-width: 1280px)" let:matches>
        {#if matches}
          <Navbar />
        {/if}
      </MediaQuery>

      <MediaQuery query="(max-width: 700px)" let:matches>
        {#if matches}
          <MobileNavDrawer>
            <Navbar />
          </MobileNavDrawer>
        {/if}
      </MediaQuery>
    </UserLoggedIn>

    <div class="p-0 lg:p-4 min-h-screen grow">
      <div
        class="bg-base-300 border-base-300 border-[16px] m-0 md:p-4 rounded-2xl"
      >
        <MediaQuery
          query="(min-width: 701px) and (max-width: 1279px)"
          let:matches
        >
          {#if matches}
            <UserLoggedIn>
              <div role="tablist" class="tabs tabs-boxed">
                <a href="/" role="tab" class="tab">
                  <Logo hideLogoText={true} logoWidth="h-8" />
                </a>
                <a
                  role="tab"
                  class="tab {$page.url.pathname === '/' ? `tab-active` : ``}"
                  href="/">Dashboard</a
                >

                <a
                  href={DISCORD_URL}
                  class="tab"
                  target="_blank"
                  rel="noreferrer"
                  ><i class="fa-regular fa-comment-code mr-2"></i> Support
                </a>

                <a
                  href={`${DOCS_URL()}`}
                  class="tab"
                  role="tab"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i class="fa-regular fa-webhook mr-2"></i> Docs
                </a>
                <a
                  role="tab"
                  class="tab {$page.url.pathname.endsWith(`/account`)
                    ? `tab-active`
                    : ``}"
                  href="/account">My Account</a
                >

                <button
                  type="button"
                  class="tab"
                  on:click={handleLogoutAndRedirect}
                  ><i class="fa-regular fa-arrow-up-left-from-circle mr-2"></i> Logout</button
                >
              </div>
            </UserLoggedIn>
          {/if}
        </MediaQuery>
        <VerifyAccountBar />

        <slot />
      </div>
    </div>
  </div>
</AuthStateGuard>
