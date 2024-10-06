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
    prerender: {
      crawl: true, // crawls links to prerender other pages
      entries: ['*'], // specify routes to prerender
    },
  },
  ssr: true,
  target: '#svelte',
}

export default config
