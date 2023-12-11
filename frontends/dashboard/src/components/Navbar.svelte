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

  const linkClasses =
    'font-medium text-xl text-base-content btn btn-ghost capitalize justify-start'
  const subLinkClasses =
    'font-medium text-base-content btn btn-ghost btn-sm capitalize justify-start'
  const addNewAppClasses =
    'font-medium text-base-content btn btn-outline btn-primary btn-sm capitalize justify-start'

  const handleClick = () => {
    document.querySelector<HTMLElement>('.drawer-overlay')?.click()
  }
</script>

<aside class="p-4 min-w-[250px] max-w-[250px] flex flex-col">
  <MediaQuery query="(min-width: 1280px)" let:matches>
    {#if matches}
      <a href="/" class="flex gap-2 items-center justify-center">
        <Logo hideLogoText={true} logoWidth="w-20" />
      </a>
    {/if}
  </MediaQuery>

  <div class="flex flex-col gap-2 mb-auto">
    <SubscriptionStatus {handleClick} />

    <a on:click={handleClick} href="/" class={linkClasses}>
      <i
        class="fa-regular fa-table-columns {$page.url.pathname === '/' &&
          'text-primary'}"
      ></i> Dashboard
    </a>

    <InstancesGuard>
      <div class="pl-8 flex flex-col gap-4 mb-4">
        {#each arrayOfActiveInstances as app}
          <a
            href={`/app/instances/${app.id}`}
            on:click={handleClick}
            class={subLinkClasses}
          >
            {#if app.maintenance}
              <i class="fa-regular fa-triangle-person-digging text-warning"></i>
            {:else}
              <i
                class="fa-regular fa-server {$page.url.pathname ===
                  `/app/instances/${app.id}` && 'text-primary'}"
              ></i>
            {/if}

            {app.subdomain}
          </a>
        {/each}
        <a href="/app/new" on:click={handleClick} class={addNewAppClasses}>
          <i
            class="fa-regular fa-plus {$page.url.pathname === `/app/new` &&
              'text-primary'}"
          ></i> Create A New App
        </a>
      </div>
    </InstancesGuard>

    <UserLoggedIn>
      <a
        href="/account"
        class={linkClasses}
        rel="noreferrer"
        on:click={handleClick}
      >
        <i class="fa-regular fa-user"></i> My Account
      </a>
    </UserLoggedIn>

    <a href={DISCORD_URL} class={linkClasses} target="_blank" rel="noreferrer"
      ><i class="fa-regular fa-comment-code"></i> Support
      <i
        class="fa-regular fa-arrow-up-right-from-square ml-auto opacity-50 text-sm"
      ></i></a
    >

    <a
      href={`${DOCS_URL()}`}
      class={linkClasses}
      target="_blank"
      rel="noreferrer"
    >
      <i class="fa-regular fa-webhook"></i> Docs
      <i
        class="fa-regular fa-arrow-up-right-from-square ml-auto opacity-50 text-sm"
      ></i></a
    >

    <a
      href="https://github.com/pockethost/pockethost"
      class={linkClasses}
      target="_blank"
      rel="noreferrer"
    >
      <i class="fa-brands fa-github"></i> GitHub
      <i
        class="fa-regular fa-arrow-up-right-from-square ml-auto opacity-50 text-sm"
      ></i></a
    >

    <UserLoggedIn>
      <button
        type="button"
        class={linkClasses}
        on:click={handleLogoutAndRedirect}
        ><i class="fa-regular fa-arrow-up-left-from-circle"></i> Logout</button
      >
    </UserLoggedIn>
  </div>
</aside>
