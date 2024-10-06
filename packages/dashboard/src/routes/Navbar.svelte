<script lang="ts">
  import Logo from '$components/Logo.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import InstancesGuard from '$src/routes/InstancesGuard.svelte'
  import { globalInstancesStore, userStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import { writable } from 'svelte/store'
  import UserLoggedIn from '../components/helpers/UserLoggedIn.svelte'
  import UserLoggedOut from '../components/helpers/UserLoggedOut.svelte'
  import AuthStateGuard from '$src/components/helpers/AuthStateGuard.svelte'

  type TypeInstanceObject = {
    id: string
    subdomain: string
    maintenance: boolean
  }

  let arrayOfActiveInstances: TypeInstanceObject[] = []

  async function gravatarHash(email: string) {
    // Normalize the email by trimming and converting to lowercase
    const normalizedEmail = email.trim().toLowerCase()
    console.log('normalizedEmail', normalizedEmail)

    // Convert the normalized email to a UTF-8 byte array
    const msgBuffer = new TextEncoder().encode(normalizedEmail)

    // Hash the email using MD5
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)

    // Convert the hash to a hex stringc
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return hashHex
  }

  const avatar = writable('')
  $: {
    if ($userStore?.email) {
      gravatarHash($userStore.email).then((hash) => {
        avatar.set(`https://www.gravatar.com/avatar/${hash}`)
      })
    }
  }

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
    document.querySelector<HTMLElement>('summary.apps')?.click()
  }
</script>

<div class="navbar bg-base-100">
  <div class="flex-1">
    <AuthStateGuard>
      <div slot="loading">
        <a href="/" role="tab" class="tab">
          <Logo hideLogoText={true} logoWidth="h-8" />
          <div class="hidden md:block ml-1">PocketHost</div>
        </a>
      </div>
      <UserLoggedIn>
        <a href="/dashboard" role="tab" class="tab">
          <Logo hideLogoText={true} logoWidth="h-8" />
          <div class="hidden md:block ml-1">PocketHost</div>
        </a>
      </UserLoggedIn>
      <UserLoggedOut>
        <a href="/" role="tab" class="tab">
          <Logo hideLogoText={true} logoWidth="h-8" />
          <div class="hidden md:block ml-1">PocketHost</div>
        </a>
      </UserLoggedOut>
    </AuthStateGuard>
  </div>
  <div class="flex-none gap-2">
    <ul class="menu menu-horizontal px-1">
      <UserLoggedOut>
        <li>
          <a href="/pricing" rel="noreferrer">Pricing</a>
        </li>
      </UserLoggedOut>
      <UserLoggedIn>
        <li>
          <details>
            <summary class="apps">Apps</summary>
            <ul class="bg-base-100 rounded-t-none p-2">
              <InstancesGuard>
                <ul role="list" class="z-50 bg-base-100">
                  <li>
                    <a href="/app/new" on:click={handleMobileNavDismiss}
                      >+ New App</a
                    >
                  </li>
                  {#each arrayOfActiveInstances as app}
                    <li>
                      <a
                        href={`/app/instances/${app.id}`}
                        on:click={handleMobileNavDismiss}>{app.subdomain}</a
                      >
                    </li>
                  {/each}
                </ul>
              </InstancesGuard>
            </ul>
          </details>
        </li>
      </UserLoggedIn>
      <li>
        <a href="/support" rel="noreferrer">Support</a>
      </li>
      <li>
        <a href="/docs" rel="noreferrer">Docs</a>
      </li>
      <UserLoggedOut>
        <li>
          <a href="/about" rel="noreferrer">About</a>
        </li>
      </UserLoggedOut>

      <UserLoggedIn>
        <li>
          <div class="dropdown dropdown-end p-0 m-0">
            <div
              tabindex="0"
              role="button"
              class="btn btn-ghost btn-circle avatar p-0 m-0 min-h-0 min-w-0 h-min"
            >
              <div class="w-8 rounded-full">
                <img src={$avatar} />
              </div>
            </div>
            <ul
              tabindex="0"
              class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
            >
              <li><a href="/account">Settings</a></li>
              <li><a on:click={handleLogoutAndRedirect}>Logout</a></li>
            </ul>
          </div>
        </li>
      </UserLoggedIn>
      <UserLoggedOut>
        <li>
          <a href="/get-started" class="">Login</a>
        </li>
      </UserLoggedOut>
      <li>
        <a href="https://github.com/pockethost/pockethost" rel="noreferrer">
          <img
            src="https://img.shields.io/github/stars/pockethost/pockethost"
          />
        </a>
      </li>
    </ul>
  </div>
</div>
