<script>
  import InitializeTooltips from '$components/InitializeTooltips.svelte'
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import Protect from '$components/helpers/Protect.svelte'
  import ThemeDetector from '$components/helpers/ThemeDetector.svelte'
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
