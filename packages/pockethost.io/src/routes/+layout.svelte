<script>
  import InitializeTooltips from '$components/InitializeTooltips.svelte'
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import Protect from '$components/helpers/Protect.svelte'
  import ThemeDetector from '$components/helpers/ThemeDetector.svelte'
  import { PUBLIC_DEBUG } from '$src/env'
  import { logger } from '@pockethost/common'
  import { onMount } from 'svelte'

  onMount(() => {
    logger({ debug: PUBLIC_DEBUG, trace: false, errorTrace: false })
  })
</script>

<Meta />
<Protect />
<ThemeDetector />

<Navbar />

<AuthStateGuard>
  <VerifyAccountBar />
</AuthStateGuard>

<main data-sveltekit-prefetch>
  <slot />
</main>

<InitializeTooltips />

<style lang="scss">
</style>
