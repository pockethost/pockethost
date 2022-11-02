<svelte:head>
  <script>
    {
      const THEME_ATTRIBUTE = 'data-theme'
      const currentTheme =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('theme='))
          ?.split('=')?.[1] || 'light'

      document.querySelector('html')?.setAttribute(THEME_ATTRIBUTE, currentTheme)
    }
  </script>
</svelte:head>
