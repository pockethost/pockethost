<script>
  import { page } from '$app/stores'
  import Logo from '$components/Logo.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
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
    <div class="p-0 lg:p-4 min-h-screen grow">
      <div
        class="bg-base-300 border-base-300 border-[16px] m-0 md:p-4 rounded-2xl"
      >
        <UserLoggedIn>
          <div role="tablist" class="tabs tabs-boxed">
            <a href="/" role="tab" class="tab">
              <Logo hideLogoText={true} logoWidth="h-8" />
            </a>

            <a
              role="tab"
              class="tab {$page.url.pathname === '/stats' ? `tab-active` : ``}"
              href="/stats">Stats</a
            >
            <a
              role="tab"
              class="tab {$page.url.pathname === '/plugins'
                ? `tab-active`
                : ``}"
              href="/plugins">Plugins</a
            >

            <button type="button" class="tab" on:click={handleLogoutAndRedirect}
              ><i class="fa-regular fa-arrow-up-left-from-circle mr-2"></i> Logout</button
            >
          </div>
        </UserLoggedIn>

        <slot />
      </div>
    </div>
  </div>
</AuthStateGuard>
