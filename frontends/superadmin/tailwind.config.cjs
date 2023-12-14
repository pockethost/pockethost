/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{svelte,js,ts,md}'],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      'light',
      'dark',
      {
        // Custom theme definitions
        dark: {
          ...require('daisyui/src/theming/themes')['[data-theme=dark]'],
          primary: '#1eb854',
          secondary: '#1db990',
          'base-content': '#ffffff',
        },
      },
      {
        // Custom theme definitions
        light: {
          ...require('daisyui/src/theming/themes')['[data-theme=light]'],
          primary: '#1eb854',
          secondary: '#1db990',
          'base-content': '#222',
        },
      },
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
}
