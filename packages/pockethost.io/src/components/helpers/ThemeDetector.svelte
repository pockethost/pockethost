<script>
</script>

<svelte:head>
  <script>
    {
      const THEME_ATTRIBUTE = 'data-bs-theme'
      const currentTheme =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('theme='))
          ?.split('=')?.[1] || 'light'

      document.querySelector('html')?.setAttribute(THEME_ATTRIBUTE, currentTheme)
      const theme = document.querySelector('#hljs-link')
      if (currentTheme === 'light') {
        theme.href =
          'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css'
      }
    }
  </script>
</svelte:head>
