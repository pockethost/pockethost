<script>
  import Meta from '$components/Meta.svelte'
  import Navbar from '$components/Navbar.svelte'
  import ThemeDetector from '$components/ThemeDetector.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import ValidateUserToken from '$components/ValidateUserToken.svelte'
</script>

<Meta />

<ThemeDetector />

<ValidateUserToken />

<Navbar />

<VerifyAccountBar />

<main data-sveltekit-prefetch>
  <slot />
</main>

<style lang="scss">
</style>
