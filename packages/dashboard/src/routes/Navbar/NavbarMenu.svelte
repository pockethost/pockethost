<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import UserHasRole from '$components/guards/UserHasRole.svelte'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import { faDiscord, faGithub, faProductHunt } from '@fortawesome/free-brands-svg-icons'
  import Avatar from './Avatar.svelte'
  import Fa from 'svelte-fa'

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

<ul
  class={`!px-0 menu ${isCollapsed ? 'dropdown-content bg-[#111111] rounded-box z-[100] mt-3 w-52  m-0 relative  shadow-xl' : 'menu-horizontal items-center'}`}
  role="menu"
  tabindex="0"
>
  <UserLoggedIn>
    <li class={isCollapsed ? '' : 'hidden lg:flex'}>
      <a href="/dashboard" rel="noreferrer">Dashboard</a>
    </li>
  </UserLoggedIn>
  <UserHasRole role="stats">
    <li class={isCollapsed ? '' : 'hidden lg:flex'}>
      <a href="/stats">Stats</a>
    </li>
  </UserHasRole>
  <li class={isCollapsed ? '' : 'hidden lg:flex'}>
    <a href="/pricing" rel="noreferrer">Pricing</a>
  </li>
  <li class={isCollapsed ? '' : 'hidden lg:flex'}>
    <a href="/blog" rel="noreferrer">Blog</a>
  </li>
  <!-- <li class={isCollapsed ? '' : 'hidden lg:flex'}>
    <a href="/support" rel="noreferrer">Support</a>
  </li> -->
  <li class={isCollapsed ? '' : 'hidden lg:flex'}>
    <a href="/docs" rel="noreferrer">Docs</a>
  </li>
  <UserLoggedOut>
    <li class={isCollapsed ? '' : 'hidden lg:flex'}>
      <a href="/about" rel="noreferrer">About</a>
    </li>
  </UserLoggedOut>
  <UserLoggedIn>
    {#if !isCollapsed}
      <li class="z-[100]">
        <div class="dropdown dropdown-end p-0 ml-2 relative">
          <!-- tabindex required for normal behavior on safari -->
          <div tabindex="0" role="button" class="h-full flex items-center" >
            <Avatar />
          </div>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <ul tabindex="0" class="dropdown-content menu bg-base-300 rounded-box z-[100] top-full mt-2 w-52 p-2 shadow">
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
</ul>

<style>
  .menu :where(li ul)::before {
    width: 0;
  }
</style>
