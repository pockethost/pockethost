/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./_includes/**/*.{html,njk,md}",
    "./content/**/*.{html,njk,md}",
  ],
  theme: {
    extend: {

    },
  },
  daisyui: {
    themes: ["light", "dark"],
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui"),
  ],
}

