<svelte:head>
  <script>
    {
      const THEME_ATTRIBUTE = 'data-theme'
      const currentTheme =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('theme='))
          ?.split('=')?.[1] || 'light'
      console.log(`Current theme is ${currentTheme}`)
      document.querySelector('html')?.setAttribute(THEME_ATTRIBUTE, currentTheme)
      console.log(document.querySelector('html'))
    }
  </script>
</svelte:head>
