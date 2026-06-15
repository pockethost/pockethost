<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import Avatar from './Avatar.svelte'

  const handleLogoutAndRedirect = async () => {
    const { logOut } = client()
    logOut()
    window.location.href = '/'
  }

  export let isCollapsed = false
</script>

{#if isCollapsed}
  <div class="flex flex-col gap-1 rounded-lg bg-[#111111] p-2 shadow-xl w-52 z-[100] mt-3">
    <a href="/" class="site-nav-link site-nav-link--menu">Home</a>
    <UserLoggedIn>
      <a href="/dashboard" class="site-nav-link site-nav-link--menu">Dashboard</a>
    </UserLoggedIn>
    <a href="/pricing" class="site-nav-link site-nav-link--menu">Pricing</a>
    <a href="/blog" class="site-nav-link site-nav-link--menu">Blog</a>
    <a href="/docs" class="site-nav-link site-nav-link--menu">Docs</a>
    <UserLoggedOut>
      <a href="/about" class="site-nav-link site-nav-link--menu">About</a>
    </UserLoggedOut>
    <UserLoggedOut>
      <a href="/login" class="site-nav-link site-nav-link--menu">Login</a>
    </UserLoggedOut>
  </div>
{:else}
  <nav class="site-nav flex items-center gap-1">
    <UserLoggedIn>
      <a href="/dashboard" class="site-nav-link">Dashboard</a>
    </UserLoggedIn>
    <a href="/pricing" class="site-nav-link">Pricing</a>
    <a href="/blog" class="site-nav-link">Blog</a>
    <a href="/docs" class="site-nav-link">Docs</a>
    <UserLoggedOut>
      <a href="/about" class="site-nav-link">About</a>
    </UserLoggedOut>
    <UserLoggedIn>
      <wa-dropdown placement="bottom-end" class="nav-user-menu ml-1">
        <button slot="trigger" type="button" class="nav-user-menu-trigger" aria-label="Account menu">
          <Avatar size={32} />
        </button>
        <wa-dropdown-item>
          <a href="/account">Settings</a>
        </wa-dropdown-item>
        <wa-dropdown-item>
          <button type="button" onclick={handleLogoutAndRedirect}>Logout</button>
        </wa-dropdown-item>
      </wa-dropdown>
    </UserLoggedIn>
    <UserLoggedOut>
      <a href="/login" class="site-nav-link site-nav-link--login">Login</a>
    </UserLoggedOut>
  </nav>
{/if}

<style>
  :global(wa-dropdown.nav-user-menu) {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
  }

  .nav-user-menu-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    line-height: 0;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .nav-user-menu-trigger:focus-visible {
    outline: 2px solid rgb(30 184 84 / 0.8);
    outline-offset: 2px;
  }
</style>
