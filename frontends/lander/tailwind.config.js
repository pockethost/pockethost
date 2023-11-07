/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./_includes/**/*.{html,njk,md}', './content/**/*.{html,njk,md}'],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
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
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
}
