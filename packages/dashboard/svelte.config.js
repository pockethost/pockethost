import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import { enhancedImages } from 'mdsvex-enhanced-images'
import { sveltePreprocess } from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.svx', '.md'],
  preprocess: [
    sveltePreprocess(),
    mdsvex({
      extensions: ['.svx', '.md'],
      remarkPlugins: [enhancedImages],
    }),
  ],
  kit: {
    adapter: adapter({
      fallback: '404.html',
    }),
    alias: {
      $components: './src/components',
      $util: './src/util',
      $src: './src',
    },
    prerender: {
      crawl: true, // crawls links to prerender other pages
      entries: ['*'], // specify routes to prerender
      handleMissingId: 'warn',
    },
  },
  ssr: true,
  target: '#svelte',
  onwarn: (warning, handler) => {
    if (warning.code.includes('a11y')) return
    handler(warning)
  },
}

export default config
