<script>
  import Navbar from '$components/Navbar.svelte'
</script>

<svelte:head>
  <script>
    {
      const THEME_ATTRIBUTE = 'data-theme'
      const currentTheme =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('theme='))
          ?.split('=')?.[1] || 'dark'
      console.log(`Current theme is ${currentTheme}`)
      document.querySelector('html')?.setAttribute(THEME_ATTRIBUTE, currentTheme)
      console.log(document.querySelector('html'))
    }
  </script>
</svelte:head>
<Navbar />

<main data-sveltekit-prefetch>
  <slot />
</main>

<style lang="scss">
</style>
