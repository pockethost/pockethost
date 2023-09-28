<script lang="ts">
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'
  import {
    THEME_ICONS,
    ThemeNames,
    currentIcon,
    getCurrentTheme,
    setCurrentTheme,
  } from './helpers/theme'

  // This can change the CSS a bit depending on where the theme toggle is rendered
  export let navLink: boolean = false

  // Set the default icon to be light mode
  let iconClass: string = browser ? currentIcon() : ''

  // Wait for the DOM to be available
  onMount(() => {
    updateTheme(getCurrentTheme())
  })

  // Alternate the theme values on toggle click
  const handleClick = () => {
    const newTheme =
      getCurrentTheme() === ThemeNames.Light
        ? ThemeNames.Dark
        : ThemeNames.Light
    updateTheme(newTheme)
  }

  const updateTheme = (themeName: ThemeNames) => {
    // Update the icon class name to toggle between light and dark mode
    iconClass = THEME_ICONS[themeName]

    setCurrentTheme(themeName)
  }
</script>

<a
  type="button"
  aria-label="Toggle the site theme"
  title="Toggle the site theme"
  on:click={handleClick}
>
  Theme
</a>
