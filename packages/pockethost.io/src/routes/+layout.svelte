<script>
  import Navbar from '$components/Navbar.svelte'
  import Meta from './Meta.svelte'
</script>

<Meta />
<Navbar />

<main data-sveltekit-prefetch>
  <slot />
</main>

<style lang="scss">
</style>
