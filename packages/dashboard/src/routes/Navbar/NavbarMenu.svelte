<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import UserHasRole from "$components/guards/UserHasRole.svelte"
  import UserLoggedIn from "$components/guards/UserLoggedIn.svelte"
  import UserLoggedOut from "$components/guards/UserLoggedOut.svelte"
  import Avatar from "./Avatar.svelte"

    // Log the user out and redirect them to the homepage
  const handleLogoutAndRedirect = async () => {
    const { logOut } = client()

    // Clear out the pocketbase information about the current user
    logOut()

    // Hard refresh to make sure any remaining data is cleared
    window.location.href = '/'
  }

  export let isCollapsed = false
</script>

<ul class={`menu ${isCollapsed ? "dropdown-content bg-base-200 rounded-box z-[1] mt-3 w-52 p-2 shadow-xl" : "menu-horizontal items-center"}`} role="menu" tabindex="0">
  <UserLoggedIn>
    <li class={isCollapsed ? "" : "hidden lg:flex"}>
      <a href="/dashboard" rel="noreferrer">Dashboard</a>
    </li>
  </UserLoggedIn>
  <UserHasRole role="stats">
    <li class={isCollapsed ? "" : "hidden lg:flex"}>
      <a href="/stats">Stats</a>
    </li>
  </UserHasRole>
  <li class={isCollapsed ? "" : "hidden lg:flex"}>
    <a href="/pricing" rel="noreferrer">Pricing</a>
  </li>
  <li class={isCollapsed ? "" : "hidden lg:flex"}>
    <a href="/support" rel="noreferrer">Support</a>
  </li>
  <li class={isCollapsed ? "" : "hidden lg:flex"}>
    <a href="/docs" rel="noreferrer">Docs</a>
  </li>
  <UserLoggedOut>
    <li class={isCollapsed ? "" : "hidden lg:flex"}>
      <a href="/about" rel="noreferrer">About</a>
    </li>
  </UserLoggedOut>

  <UserLoggedIn>
    {#if !isCollapsed}
      <li>
        
          <div class="dropdown dropdown-end p-0 m-0">
            <Avatar />

            <ul class="menu dropdown-content bg-base-300 rounded-box z-[1] mt-36 md:mt-24 w-52 p-2 shadow">
              <li><a href="/account">Settings</a></li>
              <li>
                <button on:click={handleLogoutAndRedirect}>Logout</button>
              </li>
            </ul>
          </div>
      </li>
    {/if}
  </UserLoggedIn>
  <UserLoggedOut>
    <li>
      <a href="/login" class="">Login</a>
    </li>
  </UserLoggedOut>
  {#if !isCollapsed}
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
  {/if}
</ul>

<style>
  .menu :where(li ul)::before {
    width: 0;
  }
</style>