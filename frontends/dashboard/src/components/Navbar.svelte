<script lang="ts">
  import { page } from '$app/stores'
  import Logo from '$components/Logo.svelte'
  import MediaQuery from '$components/MediaQuery.svelte'
  import { DISCORD_URL, DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import InstancesGuard from '$src/routes/InstancesGuard.svelte'
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import SubscriptionStatus from './SubscriptionStatus.svelte'
  import UserLoggedIn from './helpers/UserLoggedIn.svelte'
  import SidebarNavLink from '$components/sidebar/SidebarNavLink.svelte'

  type TypeInstanceObject = {
    id: string
    subdomain: string
    maintenance: boolean
  }

  let arrayOfActiveInstances: TypeInstanceObject[] = []

  $: {
    if ($globalInstancesStore) {
      arrayOfActiveInstances = values($globalInstancesStore).filter(
        (app) => !app.maintenance,
      )
    }
  }

  // Log the user out and redirect them to the homepage
  const handleLogoutAndRedirect = async () => {
    const { logOut } = client()

    // Clear out the pocketbase information about the current user
    logOut()

    // Hard refresh to make sure any remaining data is cleared
    window.location.href = '/'
  }

  const handleMobileNavDismiss = () => {
    document.querySelector<HTMLElement>('.drawer-overlay')?.click()
  }
</script>

<!-- Custom Tablet Navigation -->
<MediaQuery query="(min-width: 701px) and (max-width: 1024px)" let:matches>
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

        <a href={DISCORD_URL} class="tab" target="_blank" rel="noreferrer"
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

        <button type="button" class="tab" on:click={handleLogoutAndRedirect}
          ><i class="fa-regular fa-arrow-up-left-from-circle mr-2"></i> Logout</button
        >
      </div>
    </UserLoggedIn>
  {:else}
    <aside
      class="lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col w-full max-w-[360px] h-full"
    >
      <div class="flex grow flex-col overflow-y-auto bg-gray-900 px-6 h-full">
        <div class="flex shrink-0 items-center">
          <a href="/" class="" on:click={handleMobileNavDismiss}>
            <Logo hideLogoText={true} logoWidth="w-20" />
          </a>
        </div>

        <nav class="flex flex-1 flex-col">
          <SubscriptionStatus handleClick={handleMobileNavDismiss} />

          <ul role="list" class="-mx-2 space-y-1 mb-8">
            <li>
              <SidebarNavLink
                url="/"
                icon="house"
                handleClick={handleMobileNavDismiss}>Dashboard</SidebarNavLink
              >

              <InstancesGuard>
                <ul role="list" class="ml-6 space-y-1 mt-1 mb-2">
                  {#each arrayOfActiveInstances as app}
                    <li>
                      <SidebarNavLink
                        url={`/app/instances/${app.id}`}
                        icon="server"
                        iconSmall={true}
                        handleClick={handleMobileNavDismiss}
                        >{app.subdomain}</SidebarNavLink
                      >
                    </li>
                  {/each}
                </ul>

                <div class="px-4 mb-4">
                  <a
                    href="/app/new"
                    class="btn btn-primary btn-outline btn-block btn-sm"
                    on:click={handleMobileNavDismiss}
                  >
                    <i class="fa-light fa-plus"></i>
                    Create a New App
                  </a>
                </div>
              </InstancesGuard>
            </li>
            <li>
              <SidebarNavLink
                url="/account"
                icon="user"
                handleClick={handleMobileNavDismiss}>My Account</SidebarNavLink
              >
            </li>
            <li>
              <SidebarNavLink
                url={DISCORD_URL}
                icon="comment-code"
                external={true}
                handleClick={handleMobileNavDismiss}>Support</SidebarNavLink
              >
            </li>
            <li>
              <SidebarNavLink
                url={DOCS_URL()}
                icon="webhook"
                external={true}
                handleClick={handleMobileNavDismiss}>Docs</SidebarNavLink
              >
            </li>
            <li>
              <SidebarNavLink
                url="https://github.com/pockethost/pockethost"
                icon="github"
                brandIcon={true}
                external={true}
                handleClick={handleMobileNavDismiss}>GitHub</SidebarNavLink
              >
            </li>
            <li>
              <SidebarNavLink
                url="#"
                icon="arrow-up-left-from-circle"
                handleClick={handleLogoutAndRedirect}>Logout</SidebarNavLink
              >
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  {/if}
</MediaQuery>
