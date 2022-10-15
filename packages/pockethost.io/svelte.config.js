import adapter from '@sveltejs/adapter-node'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    adapter: adapter({ out: 'dist-server' }),
    alias: {
      $components: './src/components',
      $util: './src/util',
      $src: './src'
    }
  },
  target: '#svelte'
}

export default config
