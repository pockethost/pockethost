<script lang="ts">
  import { browser } from '$app/environment'
  import { assertTruthy } from '@pockethost/common'
  import { find } from '@s-libs/micro-dash'
  import Cookies from 'js-cookie'
  import { onMount } from 'svelte'

  // Set some default values to be referenced later
  enum ThemeNames {
    Light = 'light',
    Dark = 'dark'
  }
  const ALLOWED_THEMES: ThemeNames[] = [ThemeNames.Light, ThemeNames.Dark]
  const DEFAULT_THEME: ThemeNames = ThemeNames.Light
  const STORAGE_NAME: string = 'theme'
  const THEME_ATTRIBUTE: string = 'data-theme'
  const THEME_ICONS: { [_ in ThemeNames]: string } = {
    [ThemeNames.Light]: 'bi bi-moon-stars',
    [ThemeNames.Dark]: 'bi bi-brightness-high'
  }

  const html = () => {
    const htmlElement = document.querySelector('html')
    assertTruthy(htmlElement, `Expected <html> element to exist`)
    return htmlElement
  }
  const currentTheme = () => {
    const htmlElement = html()
    const _att = htmlElement.getAttribute(THEME_ATTRIBUTE)
    const currentTheme = find(ALLOWED_THEMES, (v) => _att === v) || DEFAULT_THEME
    return currentTheme
  }
  const currentIcon = () => {
    return THEME_ICONS[currentTheme()]
  }

  // This can change the CSS a bit depending on where the theme toggle is rendered
  export let navLink: boolean = false

  // Set the default icon to be light mode
  let iconClass: string = browser ? currentIcon() : ''

  // Wait for the DOM to be available
  onMount(() => {
    updateTheme(currentTheme())
  })

  // Alternate the theme values on toggle click
  const handleClick = () => {
    const newTheme = currentTheme() === ThemeNames.Light ? ThemeNames.Dark : ThemeNames.Light
    updateTheme(newTheme)
  }

  const updateTheme = (themeName: ThemeNames) => {
    const htmlElement = html()

    // Update the icon class name to toggle between light and dark mode
    iconClass = THEME_ICONS[themeName]

    // Update the HTML element to have the right data-theme value
    htmlElement.setAttribute(THEME_ATTRIBUTE, themeName)

    Cookies.set(STORAGE_NAME, themeName)
  }
</script>

<button
  type="button"
  class="{navLink && 'nav-link'} btn border-0 d-inline-block"
  aria-label="Toggle the site theme"
  title="Toggle the site theme"
  on:click={handleClick}
>
  <i class={iconClass} />
</button>
