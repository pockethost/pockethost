<script lang="ts">
  import { onMount } from 'svelte'
  import { ThemeNames, getCurrentTheme, setCurrentTheme } from './helpers/theme'

  // This will keep track of the toggle's state
  let isChecked = true

  // Wait for the DOM to be available
  onMount(() => {
    // Check what theme cookie is set
    const currentTheme = getCurrentTheme()

    // Set the toggle's state
    isChecked = currentTheme === ThemeNames.Dark

    // Update the site's theme to match what the cookie has
    updateTheme(getCurrentTheme())
  })

  // Alternate the theme values on toggle click
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const isChecked = target.checked

    const newTheme = isChecked ? ThemeNames.Dark : ThemeNames.Light

    updateTheme(newTheme)
  }

  const updateTheme = (themeName: ThemeNames) => {
    setCurrentTheme(themeName)
  }
</script>

<div class="form-control">
  <label class="label cursor-pointer">
    <span class="label-text">Dark Mode</span>
    <input
      type="checkbox"
      class="toggle"
      bind:checked={isChecked}
      on:change={handleChange}
    />
  </label>
</div>
