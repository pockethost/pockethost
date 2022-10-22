<script lang="ts">
    import {onMount} from "svelte";

    // This can change the CSS a bit depending on where the theme toggle is rendered
    export let navLink: boolean = false;

    // Set the default icon to be light mode
    let iconClass: string = "bi bi-moon-stars";

    // Set some default values to be referenced later
    const STORAGE_NAME: string = "theme";
    const THEME_ATTRIBUTE: string = "data-theme";

    // FIXME: I don't think these enums are right
    enum PossibleThemeValues {
        Dark = {
            icon: "bi bi-brightness-high",
            theme: "dark",
        },
        Light = {
            icon: "bi bi-moon-stars",
            theme: "light",
        },
    }

    // This will track the user's theme throughout the app
    let localStorageTheme = "";

    // Wait for the DOM to be available
    onMount(() => {
        // First get the site default theme
        const htmlElement: Element = document.querySelector("html");
        const currentTheme: string = htmlElement.getAttribute(THEME_ATTRIBUTE)

        // If this is the user's first time on the site, set the default theme
        if(localStorage.getItem(STORAGE_NAME) === null) {
            localStorage.setItem(STORAGE_NAME, currentTheme)
        }

        // Now get the user's theme value
        localStorageTheme = localStorage.getItem(STORAGE_NAME);

        // If the storage item is different from the HTML theme attribute, update the HTML
        if(localStorageTheme === "light") {
            updateTheme(PossibleThemeValues.Light)
        } else {
            updateTheme(PossibleThemeValues.Dark)
        }
		})

		// Alternate the theme values on toggle click
    const handleClick = () => {
        // Get the user's current theme setting
        localStorageTheme = localStorage.getItem(STORAGE_NAME);

				if(localStorageTheme === "light") {
            updateTheme(PossibleThemeValues.Dark)
        } else {
            updateTheme(PossibleThemeValues.Light)
        }
    }

    const updateTheme = (type: PossibleThemeValues) => {
        const htmlElement: Element = document.querySelector("html");

        // Update the icon class name to toggle between light and dark mode
        iconClass = type['icon']

        // Update the HTML element to have the right data-theme value
        htmlElement.setAttribute(THEME_ATTRIBUTE, type['theme'])

				// Now update the localStorage to have the latest value
				localStorage.setItem(STORAGE_NAME, type['theme'])
    }
</script>

<button
	type="button"
	class="{navLink && 'nav-link'} btn border-0"
	aria-label="Toggle the site theme"
	on:click={handleClick}>
	<i class={iconClass}></i>
</button>