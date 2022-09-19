<script>
  import Navbar from '$components/Navbar.svelte'
  import { Styles } from 'sveltestrap'
</script>

<Styles />
<Navbar />
<main>
  <slot />
</main>

<style lang="scss">
  main {
    margin-top: 20px;
  }
</style>
