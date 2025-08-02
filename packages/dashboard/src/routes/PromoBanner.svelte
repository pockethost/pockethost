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
  <div class="alert py-3 flex justify-center px-8 md:px-20 items-center alert-info bg-yellow-300 rounded-none mb-1 relative">
    <div class="text-info-content flex-1">
      {latestPost.title}
      <a href={latestPost.path} class="btn ml-2  btn-sm bg-transparent text-black">Learn more</a>
    </div>
    <button
      class="btn btn-ghost btn-circle btn-md text-xl hover:bg-yellow-400 absolute top-0 right-0"
      on:click={dismissBanner}
      aria-label="Dismiss banner"
    >
      ✕
    </button>
  </div>
{/if}
