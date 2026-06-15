import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import { mdsvexHighlight } from './src/lib/mdsvexHighlight.js'
import { rehypeRouteImages, remarkRouteImages } from './src/lib/remarkRouteImages.js'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.svx', '.md'],
  preprocess: [
    mdsvex({
      extensions: ['.svx', '.md'],
      remarkPlugins: [remarkRouteImages],
      rehypePlugins: [rehypeRouteImages],
      highlight: {
        highlighter: mdsvexHighlight,
        optimise: true,
        alias: {
          js: 'javascript',
          ts: 'typescript',
          cron: 'plaintext',
          sshconfig: 'plaintext',
        },
      },
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
      crawl: true,
      entries: ['*'],
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
