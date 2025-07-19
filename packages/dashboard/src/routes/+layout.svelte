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

  const currentYear = new Date().getFullYear()

  onMount(() => {
    init()
  })
</script>

<Meta />

<div>
  <MothershipStatus />
  <Navbar />
  <PromoBanner />

  <div class="px-4 sm:px-6 lg:px-8">
    <VerifyAccountBar />
  </div>
  <slot />
</div>
<div class="p-10 text-xs text-neutral-content flex flex-col text-center items-center">
  <div class="flex flex-row space-x-5">
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="https://status.pockethost.io/">System Status</a>
  </div>
  <div>(c) {currentYear}, PocketHost</div>
  <div>Proudly hacking open source in Reno, NV</div>
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

    gtag('config', 'G-5Q6CM5HPCX')
  </script>
</div>
