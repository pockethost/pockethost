<script lang="ts">
  import Navbar from '$src/routes/Navbar/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import Meta from '$components/guards/Meta.svelte'
  import '../app.css'
  import { onMount } from 'svelte'
  import { init } from '$util/stores'

  onMount(() => {
    init()
  })
</script>

<Meta />

<div>
  <Navbar />

  <div class="px-4 sm:px-6 lg:px-8">
    <VerifyAccountBar />
  </div>
  <slot />
</div>
<div
  class="p-10 text-xs text-neutral-content flex flex-col text-center items-center"
>
  <div class="flex flex-row space-x-5">
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="https://status.pockethost.io/">System Status</a>
  </div>
  <div>(c) 2024, PocketHost</div>
  <div>Proudly hacking open source in Reno, NV</div>
</div>
