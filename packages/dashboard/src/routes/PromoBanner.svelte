<script lang="ts">
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import { onMount } from 'svelte'
  import { browser, dev } from '$app/environment'
  import { is23Available } from '$util/stores'

  const BANNER_KEY = 'promo-banner-v0.23-dismissed'
  $: isActive = $is23Available
  $: isVisible = isActive && browser && !localStorage.getItem(BANNER_KEY)

  $: console.log('is23Available', $is23Available)

  function dismissBanner() {
    localStorage.setItem(BANNER_KEY, 'true')
    isVisible = false
  }
</script>

{#if isVisible}
  <div class="alert alert-info bg-yellow-300 rounded-none mb-10 relative">
    <div class="text-info-content flex-1">
      v0.23 is now available.
      <UserLoggedIn>
        <a href="/instances/new" class="btn btn-sm btn-neutral m-2"
          >Try it now!</a
        >
      </UserLoggedIn>
      <UserLoggedOut>
        <a href="/get-started" class="btn btn-sm btn-neutral m-2"
          >Get started now!</a
        >
      </UserLoggedOut>
    </div>
    <button
      class="btn btn-ghost btn-circle btn-xs absolute top-0 right-0"
      on:click={dismissBanner}
      aria-label="Dismiss banner"
    >
      ✕
    </button>
  </div>
{/if}
