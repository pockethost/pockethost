<script lang="ts">
  import { onMount } from 'svelte'
  import { toc } from '$src/routes/(static)/blog/toc'

  const latestPost = toc[0]!
  const BANNER_KEY = 'promo-banner'

  let isVisible = false

  onMount(() => {
    isVisible = localStorage.getItem(BANNER_KEY) !== latestPost.path
  })

  function dismissBanner() {
    localStorage.setItem(BANNER_KEY, latestPost.path)
    isVisible = false
  }
</script>

{#if isVisible}
  <div class="border-b border-white/10 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent">
    <div class="max-w-content mx-auto px-4 md:px-20 py-2.5">
      <div class="flex items-start gap-3 min-w-0 sm:items-center">
        <wa-icon name="bullhorn" class="mt-0.5 shrink-0 text-primary text-sm sm:mt-0"></wa-icon>
        <p class="min-w-0 flex-1 text-sm leading-snug text-white/90">
          <span class="font-medium">{latestPost.title}</span>
          <span class="mx-2 hidden text-white/30 sm:inline" aria-hidden="true">·</span>
          <a
            href={latestPost.path}
            class="mt-1 block text-primary hover:text-secondary underline underline-offset-2 sm:mt-0 sm:inline"
            onclick={dismissBanner}
          >
            Learn more
          </a>
        </p>
        <button
          type="button"
          class="shrink-0 rounded p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
          onclick={dismissBanner}
          aria-label="Dismiss banner"
        >
          <wa-icon name="xmark"></wa-icon>
        </button>
      </div>
    </div>
  </div>
{/if}
