/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{svelte,js,ts,md}'],
  safelist: [
    'lg:pl-72',
    {
      pattern: /size-.*/,
    },
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1eb854',
        secondary: '#1db990',
        light: '#3a37ca',
        error: '#ef4444',
        success: '#1eb854',
        warning: '#fbbf24',
      },
      maxWidth: {
        content: '72rem',
        prose: '65ch',
        form: '42rem',
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
  plugins: [require('@tailwindcss/typography')],
}
