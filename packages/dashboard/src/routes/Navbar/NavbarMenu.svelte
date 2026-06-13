<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import UserHasRole from '$components/guards/UserHasRole.svelte'
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
    <UserHasRole role="stats">
      <wa-button href="/stats" appearance="plain" class="justify-start">Stats</wa-button>
    </UserHasRole>
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
    <UserHasRole role="stats">
      <wa-button href="/stats" appearance="plain" class="hidden lg:inline-flex">Stats</wa-button>
    </UserHasRole>
    <wa-button href="/pricing" appearance="plain" class="hidden lg:inline-flex">Pricing</wa-button>
    <wa-button href="/blog" appearance="plain" class="hidden lg:inline-flex">Blog</wa-button>
    <wa-button href="/docs" appearance="plain" class="hidden lg:inline-flex">Docs</wa-button>
    <UserLoggedOut>
      <wa-button href="/about" appearance="plain" class="hidden lg:inline-flex">About</wa-button>
    </UserLoggedOut>
    <UserLoggedIn>
      <wa-dropdown placement="bottom-end" class="ml-2">
        <wa-button slot="trigger" appearance="plain" class="h-full flex items-center p-0">
          <Avatar />
        </wa-button>
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
