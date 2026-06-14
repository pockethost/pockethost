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
  <div class="px-4 md:px-20">
    <wa-callout variant="brand" class="py-2 px-4 md:px-6 border border-primary/25">
      <wa-icon slot="icon" name="bullhorn"></wa-icon>
      <div class="flex flex-1 items-center justify-between gap-4 min-w-0">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm min-w-0">
          <span class="font-medium">{latestPost.title}</span>
          <a
            href={latestPost.path}
            class="text-xs text-white/85 hover:text-white underline underline-offset-2 whitespace-nowrap"
            onclick={dismissBanner}
          >
            Learn more
          </a>
        </div>
        <wa-button
          variant="neutral"
          size="small"
          appearance="plain"
          class="shrink-0"
          onclick={dismissBanner}
          aria-label="Dismiss banner"
        >
          <wa-icon name="xmark"></wa-icon>
        </wa-button>
      </div>
    </wa-callout>
  </div>
{/if}
