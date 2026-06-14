<script lang="ts">
  import Navbar from '$src/routes/Navbar/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import Meta from '$components/guards/Meta.svelte'
  import '../app.css'
  import '$lib/webawesome.ts'
  import { onMount } from 'svelte'
  import { init } from '$util/stores'
  import '@beyonk/gdpr-cookie-consent-banner/banner.css'
  // @ts-ignore
  import GdprBanner from '@beyonk/gdpr-cookie-consent-banner'
  import PocketHost30Banner from './PocketHost30Banner.svelte'
  import MothershipStatus from './MothershipStatus.svelte'
  import { cloudLogo } from '$lib/brand'
  import a11yDark from 'svelte-highlight/styles/seti-ui'

  const currentYear = new Date().getFullYear()

  onMount(() => {
    init()
  })
</script>

<Meta />

<svelte:head>
  <title>PocketHost</title>
  {@html a11yDark}
</svelte:head>

<div class="bg-[#111111]">
  <MothershipStatus />
  <Navbar />
  <PocketHost30Banner />

  <div class="px-4 md:px-20">
    <VerifyAccountBar />
  </div>
  <div class="w-full">
    <slot />
  </div>

  <footer class="text-white px-4 md:px-20 pt-6 pb-8 text-sm relative z-1 border-t border-neutral-700">
    <div class="flex flex-col gap-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div class="flex items-center gap-5">
          <a href="/" rel="noreferrer">
            <img src={cloudLogo} alt="Pockethost Logo" class="h-12 w-auto" />
          </a>
          <div class="flex items-center gap-4 text-neutral-400">
            <a href="https://github.com/pockethost/pockethost" rel="noreferrer" target="_blank" class="hover:text-white">
              <wa-icon name="github" family="brands"></wa-icon>
            </a>
            <a href="https://www.producthunt.com/products/pockethost" rel="noreferrer" target="_blank" class="hover:text-white">
              <wa-icon name="product-hunt" family="brands"></wa-icon>
            </a>
            <a href="https://discord.gg/nVTxCMEcGT" rel="noreferrer" target="_blank" class="hover:text-white">
              <wa-icon name="discord" family="brands"></wa-icon>
            </a>
            <a href="https://www.youtube.com/@pocketba5ed" rel="noreferrer" target="_blank" class="hover:text-white">
              <wa-icon name="youtube" family="brands"></wa-icon>
            </a>
          </div>
        </div>

        <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-neutral-300">
          <a href="/docs" class="hover:text-white hover:underline">Docs</a>
          <a href="/blog" class="hover:text-white hover:underline">Blog</a>
          <a href="https://github.com/pockethost/pockethost" rel="noreferrer" target="_blank" class="hover:text-white hover:underline">GitHub</a>
          <span class="hidden sm:inline text-neutral-600" aria-hidden="true">·</span>
          <a href="https://discord.gg/nVTxCMEcGT" rel="noreferrer" target="_blank" class="hover:text-white hover:underline">Discord</a>
          <a href="/support" class="hover:text-white hover:underline">Support</a>
          <a href="https://status.pockethost.io/" class="hover:text-white hover:underline">Status</a>
        </nav>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-neutral-500">
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <a href="/privacy" class="hover:text-neutral-300 hover:underline">Privacy</a>
          <a href="/terms" class="hover:text-neutral-300 hover:underline">Terms</a>
          <a href="https://status.pockethost.io/" rel="noreferrer" target="_blank" class="hover:text-neutral-300 hover:underline">System Status</a>
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
<GdprBanner
  cookieName="pockethost_gpdr"
  description="PocketHost uses cookies to ensure you get the best experience."
  showEditIcon={false}
/>
<div>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-5Q6CM5HPCX"></script>
  <script>
    window.dataLayer = window.dataLayer || []
    function gtag() {
      dataLayer.push(arguments)
    }
    gtag('js', new Date())

    gtag('config', 'G-5Q6CM5HPCX', {
      'cookie_domain': 'none'
    })
  </script>
</div>
