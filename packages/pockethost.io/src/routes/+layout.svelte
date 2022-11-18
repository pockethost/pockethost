<script>
  import Meta from '$components/helpers/Meta.svelte'
  import Protect from '$components/helpers/Protect.svelte'
  import ThemeDetector from '$components/helpers/ThemeDetector.svelte'
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import InitializeTooltips from '$components/InitializeTooltips.svelte'
</script>

<Meta />
<Protect />
<ThemeDetector />

<Navbar />

<VerifyAccountBar />

<main data-sveltekit-prefetch>
  <slot />
</main>

<InitializeTooltips />

<style lang="scss">
</style>
