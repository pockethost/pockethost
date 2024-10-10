<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import UserHasRole from '$components/guards/UserHasRole.svelte'
  import Avatar from './Avatar.svelte'

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
    document.querySelector<HTMLElement>('summary.apps')?.click()
  }
</script>

<div class="navbar bg-base-100 min-w-[375px]">
  <div class="flex-1 min-w-10">
    <a href="/" class="flex items-center">
      <Logo hideLogoText={true} size={32} />
      <div class="hidden md:block ml-1 text-sm">PocketHost</div>
    </a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1 text-xs">
      <UserLoggedIn>
        <li>
          <a href="/dashboard" rel="noreferrer">Dashboard</a>
        </li>
      </UserLoggedIn>
      <UserHasRole role="stats">
        <li>
          <a href="/stats">Stats</a>
        </li>
      </UserHasRole>
      <li>
        <a href="/pricing" rel="noreferrer">Pricing</a>
      </li>
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
            <Avatar />

            <ul
              class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
            >
              <li><a href="/account">Settings</a></li>
              <li>
                <button on:click={handleLogoutAndRedirect}>Logout</button>
              </li>
            </ul>
          </div>
        </li>
      </UserLoggedIn>
      <UserLoggedOut>
        <li>
          <a href="/login" class="">Login</a>
        </li>
      </UserLoggedOut>
      <li>
        <a href="https://github.com/pockethost/pockethost" rel="noreferrer">
          <img
            src="https://img.shields.io/github/stars/pockethost/pockethost"
            width="88"
            height="20"
            alt="GitHub stars"
          />
        </a>
      </li>
    </ul>
  </div>
</div>
