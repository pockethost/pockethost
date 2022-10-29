<script>
  import Meta from '$components/Meta.svelte'
  import Navbar from '$components/Navbar.svelte'
  import Protect from '$components/Protect.svelte'
  import ThemeDetector from '$components/ThemeDetector.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
</script>

<Meta />

<Protect />

<ThemeDetector />

<Navbar />

<VerifyAccountBar />

<main data-sveltekit-prefetch>
  <slot />
</main>

<style lang="scss">
</style>
