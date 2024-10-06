import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.svx', '.md'],
  preprocess: [preprocess(), mdsvex({ extensions: ['.svx', '.md'] })],
  kit: {
    adapter: adapter({
      pages: '../../dist/dashboard',
      fallback: 'index.html',
    }),
    alias: {
      $components: './src/components',
      $util: './src/util',
      $src: './src',
    },
  },
  target: '#svelte',
}

export default config
