<script>
  import Navbar from '$components/Navbar.svelte'
</script>

<Navbar />

<main data-sveltekit-prefetch>
  <slot />
</main>

<style lang="scss">
  main {
    margin-top: 20px;
  }
</style>
