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
  <div class="px-4 md:px-20">
    <wa-callout variant="warning" class="py-2 justify-center px-8">
      <div class="flex-1 text-sm flex text-white items-center justify-start gap-4">
        {latestPost.title}
        <wa-button href={latestPost.path} variant="neutral" size="small" appearance="outline">Learn more</wa-button>
      </div>
      <wa-button
        slot="actions"
        variant="neutral"
        size="small"
        appearance="plain"
        onclick={dismissBanner}
        aria-label="Dismiss banner"
      >
        <wa-icon name="xmark"></wa-icon>
      </wa-button>
    </wa-callout>
  </div>
{/if}
