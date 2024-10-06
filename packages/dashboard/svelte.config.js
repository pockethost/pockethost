import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import preprocess from 'svelte-preprocess'
// mdsvex.config.js
import fancyImages from './src/lib/mdsvex-url-to-import.js'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.svx', '.md'],
  preprocess: [
    preprocess(),
    mdsvex({ extensions: ['.svx', '.md'], remarkPlugins: [fancyImages] }),
  ],
  kit: {
    adapter: adapter({
      fallback: 'fallback.html',
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
