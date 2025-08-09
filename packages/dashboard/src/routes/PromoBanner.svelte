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
<div class="px-8 md:px-20">

  <div class="alert py-2 flex justify-center rounded-md px-8 items-center alert-info bg-yellow-300/20 border-white/10 text-white  relative">
    <div class=" flex-1 text-sm flex text-white items-center justify-start gap-4" >
      {latestPost.title}
      <a href={latestPost.path} class="btn  btn-xs bg-transparent border-white   hover:bg-transparent">Learn more</a>
    </div>
    <button
      class="btn btn-ghost btn-circle btn-sm text-xl hover:bg-yellow-300/20"
      on:click={dismissBanner}
      aria-label="Dismiss banner"
    >
      ✕
    </button>
  </div>
</div>

{/if}
