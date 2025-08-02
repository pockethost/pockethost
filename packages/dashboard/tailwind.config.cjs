/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{svelte,js,ts,md}'],
  safelist: [
    'lg:pl-72',
    {
      pattern: /(toggle|text|bg)-(error|success|warning|red-500)/,
      variants: ['responsive', 'hover'],
    },
    {
      pattern: /size-.*/,
    },
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3532b9',
        secondary: '#92a3ff',
        light:'#3a37ca'
      },
      animation: {
        text: 'text 5s ease infinite',
      },
      keyframes: {
        text: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
    },
  },
  daisyui: {
    themes: [
      'light',
      'dark',
      {
        // Custom theme definitions
        dark: {
          ...require('daisyui/src/theming/themes')['dark'],
          primary: '#1eb854',
          secondary: '#1db990',
          'base-content': '#ffffff',
        },
      },
      {
        // Custom theme definitions
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          primary: '#1eb854',
          secondary: '#1db990',
          'base-content': '#222',
        },
      },
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
}
