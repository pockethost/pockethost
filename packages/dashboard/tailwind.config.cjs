/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{svelte,js,ts,md}'
  ],
  theme: {
    extend: {

    },
  },
  daisyui: {
    themes: ["light", "dark"],
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('daisyui')
  ],
}
