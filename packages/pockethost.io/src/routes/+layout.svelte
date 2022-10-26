<script>
  import Meta from '$components/Meta.svelte'
  import Navbar from '$components/Navbar.svelte'
  import ThemeDetector from '$components/ThemeDetector.svelte'
</script>

<Meta />
<ThemeDetector />
<Navbar />

<main data-sveltekit-prefetch>
  <slot />
</main>

<style lang="scss">
</style>
