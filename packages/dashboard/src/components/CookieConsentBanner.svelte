<script lang="ts">
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'
  import { acceptCookieConsent, hasCookieConsent, loadGoogleAnalytics } from '$lib/cookieConsent'

  let visible = $state(false)

  onMount(() => {
    if (hasCookieConsent()) {
      loadGoogleAnalytics()
      return
    }
    visible = true
  })

  function accept() {
    acceptCookieConsent()
    visible = false
  }
</script>

{#if browser && visible}
  <div
    class="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111111]/95 px-4 py-4 backdrop-blur-sm md:px-20"
    role="dialog"
    aria-label="Cookie consent"
    transition:slide={{ duration: 200 }}
  >
    <wa-callout variant="neutral" class="wa-callout-padded border border-white/10">
      <wa-icon slot="icon" name="shield-halved"></wa-icon>
      <div class="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm leading-snug text-white/90">
          PocketHost uses cookies for analytics so we can improve the product.
          <a href="/privacy" class="text-primary hover:text-secondary underline underline-offset-2">Privacy policy</a>
        </p>
        <wa-button type="button" variant="brand" size="small" class="shrink-0" onclick={accept}>Accept</wa-button>
      </div>
    </wa-callout>
  </div>
{/if}
