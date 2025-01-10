<script lang="ts">
  import { browser } from '$app/environment'
  import { toc } from '$src/routes/(static)/blog/toc'

  const latestPost = toc[0]!
  const BANNER_KEY = 'promo-banner'
  $: isVisible = browser && localStorage.getItem(BANNER_KEY) !== latestPost.path

  function dismissBanner() {
    localStorage.setItem(BANNER_KEY, toc[0]?.path ?? '')
    isVisible = false
  }
</script>

{#if isVisible}
  <div class="alert alert-info bg-yellow-300 rounded-none mb-10 relative">
    <div class="text-info-content flex-1">
      {latestPost.title}
      <a href={latestPost.path} class="btn btn-sm btn-neutral m-2">Learn more</a
      >
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
