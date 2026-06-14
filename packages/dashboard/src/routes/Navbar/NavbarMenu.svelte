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
  <div class="flex flex-col gap-1 bg-[#111111] rounded-lg z-[100] mt-3 w-52 p-2 shadow-xl">
    <wa-button href="/" appearance="plain" class="justify-start">Home</wa-button>
    <UserLoggedIn>
      <wa-button href="/dashboard" appearance="plain" class="justify-start">Dashboard</wa-button>
    </UserLoggedIn>
    <wa-button href="/pricing" appearance="plain" class="justify-start">Pricing</wa-button>
    <wa-button href="/blog" appearance="plain" class="justify-start">Blog</wa-button>
    <wa-button href="/docs" appearance="plain" class="justify-start">Docs</wa-button>
    <UserLoggedOut>
      <wa-button href="/about" appearance="plain" class="justify-start">About</wa-button>
    </UserLoggedOut>
    <UserLoggedOut>
      <wa-button href="/login" appearance="plain" class="justify-start">Login</wa-button>
    </UserLoggedOut>
  </div>
{:else}
  <nav class="flex items-center gap-1">
    <UserLoggedIn>
      <wa-button href="/dashboard" appearance="plain" class="hidden lg:inline-flex">Dashboard</wa-button>
    </UserLoggedIn>
    <wa-button href="/pricing" appearance="plain" class="hidden lg:inline-flex">Pricing</wa-button>
    <wa-button href="/blog" appearance="plain" class="hidden lg:inline-flex">Blog</wa-button>
    <wa-button href="/docs" appearance="plain" class="hidden lg:inline-flex">Docs</wa-button>
    <UserLoggedOut>
      <wa-button href="/about" appearance="plain" class="hidden lg:inline-flex">About</wa-button>
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
      <wa-button href="/login" appearance="plain">Login</wa-button>
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
