<script lang="ts">
  import { page } from '$app/stores'
  import Logo from '$components/Logo.svelte'
  import MediaQuery from '$components/MediaQuery.svelte'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
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
    <a on:click={handleClick} href="/" class={linkClasses}>
      <i
        class="fa-regular fa-table-columns {$page.url.pathname === '/' &&
          'text-primary'}"
      ></i> Dashboard
    </a>

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
