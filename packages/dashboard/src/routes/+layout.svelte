<script lang="ts">
  import Navbar from '$src/routes/Navbar/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import Meta from '$components/guards/Meta.svelte'
  import '../app.css'
  import '$lib/webawesome-icons'
  import '$lib/webawesome'
  import { onMount } from 'svelte'
  import { init } from '$util/stores'
  import CookieConsentBanner from '$components/CookieConsentBanner.svelte'
  import PocketHost30Banner from './PocketHost30Banner.svelte'
  import MothershipStatus from './MothershipStatus.svelte'
  import { cloudLogo } from '$lib/brand'
  import { proseCodeBlocks } from '$lib/proseCodeBlocks'
  import a11yDark from 'svelte-highlight/styles/seti-ui'

  const currentYear = new Date().getFullYear()

  onMount(() => {
    init()
  })
</script>

<Meta />

<svelte:head>
  <title>PocketHost</title>
  <link rel="preload" as="image" href={cloudLogo} />
  {@html a11yDark}
</svelte:head>

<div class="bg-[#111111]">
  <MothershipStatus />
  <Navbar />
  <PocketHost30Banner />

  <div class="px-4 md:px-20">
    <VerifyAccountBar />
  </div>
  <div class="w-full" use:proseCodeBlocks>
    <slot />
  </div>

  <footer class="text-white px-4 md:px-20 pt-6 pb-8 text-sm relative z-1 border-t border-neutral-700">
    <div class="flex flex-col gap-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-neutral-500">
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <a href="/privacy" class="hover:text-neutral-300 hover:underline">Privacy</a>
          <a href="/terms" class="hover:text-neutral-300 hover:underline">Terms</a>
          <a
            href="https://status.pockethost.io/"
            rel="noreferrer"
            target="_blank"
            class="hover:text-neutral-300 hover:underline">System Status</a
          >
        </div>
        <div class="sm:text-right">
          <span>&copy; <span id="year">{currentYear}</span> PocketHost</span>
          <span class="mx-2 text-neutral-700" aria-hidden="true">·</span>
          <span>Proudly hacking open source in Reno, NV ❤️</span>
        </div>
      </div>
    </div>
  </footer>
</div>
<CookieConsentBanner />
