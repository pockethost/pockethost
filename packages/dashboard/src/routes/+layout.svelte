<script lang="ts">
  import Navbar from '$src/routes/Navbar/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import Meta from '$components/guards/Meta.svelte'
  import '../app.css'
  import { onMount } from 'svelte'
  import { init } from '$util/stores'
  import '@beyonk/gdpr-cookie-consent-banner/banner.css' // optional, you can also define your own styles
  // @ts-ignore
  import GdprBanner from '@beyonk/gdpr-cookie-consent-banner'
  import PromoBanner from './PromoBanner.svelte'
  import MothershipStatus from './MothershipStatus.svelte'

  import Fa from 'svelte-fa'
  import { faDiscord, faGithub, faProductHunt, faYoutube } from '@fortawesome/free-brands-svg-icons'

  import { get } from 'svelte/store'

  const currentYear = new Date().getFullYear()

  onMount(() => {
    init()
  })
</script>

<Meta />

<div class="bg-[#111111]">
  <MothershipStatus />
  <Navbar />
  <PromoBanner />

  <div class="px-4 md:px-20">
    <VerifyAccountBar />
  </div>
  <div class="w-full">
    <slot />
  </div>

  <footer class="text-neutral-content px-4 md:px-20 py-10 text-sm relative z-1">
    <div class=" flex justify-between items-center">
      <div class="">
        <a href="/" rel="noreferrer">
          <img src="/pockethost-cloud-logo.png" alt="Pockethost Logo" class="h-28 md:h-36 w-auto" />
        </a>
        <div class="flex items-center gap-4 md:gap-6">
          <a href="https://github.com/pockethost/pockethost" rel="noreferrer" target="_blank">
            <Fa icon={faGithub} />
          </a>
          <a href="https://www.producthunt.com/products/pockethost" rel="noreferrer" target="_blank">
            <Fa icon={faProductHunt} />
          </a>
          <a href="https://discord.gg/nVTxCMEcGT" rel="noreferrer" target="_blank">
            <Fa icon={faDiscord} />
          </a>
          <a href="https://www.youtube.com/@pocketba5ed" rel="noreferrer" target="_blank">
            <Fa icon={faYoutube} />
          </a>
        </div>
      </div>
      <div class="flex-1 flex justify-around md:justify-start md:space-x-32 md:ml-32">
        <div>
          <h3 class="font-semibold mb-3">Explore</h3>
          <ul class="space-y-1">
            <li><a href="/docs" class="hover:underline">Docs</a></li>
            <li><a href="/blog" class="hover:underline">Blog</a></li>
            <li><a href="https://github.com/pockethost/pockethost" rel="noreferrer" target="_blank" class="hover:underline">GitHub</a></li>
          </ul>
        </div>

        <div>
          <h3 class="font-semibold mb-3">Contact</h3>
          <ul class="space-y-1">
            <li><a href="https://discord.gg/nVTxCMEcGT" rel="noreferrer" target="_blank" class="hover:underline">Discord</a></li>
            <li><a href="/support" class="hover:underline">Support</a></li>
            <li><a href="https://status.pockethost.io/" class="hover:underline">Status</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div
      class="mt-10 border-t border-neutral-700 pt-4 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-6"
    >
      <div class="flex space-x-4">
        <a href="/privacy" class="hover:underline">Privacy</a>
        <a href="/terms" class="hover:underline">Terms</a>
        <a href="https://status.pockethost.io/" rel="noreferrer" target="_blank" class="hover:underline">System Status</a>
      </div>

      <div class="flex flex-col text-xs gap-1 text-center md:text-right">
        <div>&copy; <span id="year">{currentYear}</span> - PocketHost</div>
        <div>Proudly hacking open source in Reno, NV ❤️</div>
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
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-5Q6CM5HPCX"></script>
  <script>
    window.dataLayer = window.dataLayer || []
    function gtag() {
      dataLayer.push(arguments)
    }
    gtag('js', new Date())

    gtag('config', 'G-5Q6CM5HPCX', {
      // Avoid sending the cookie to subdomains of pockethost.io.
      'cookie_domain': 'none'
    })
  </script>
</div>
