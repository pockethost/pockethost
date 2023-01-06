import markdown from '@dansvel/vite-plugin-markdown'
import { sveltekit } from '@sveltejs/kit/vite'
import type { UserConfig } from 'vite'
import markedOptions from './marked.config.js'

const config: UserConfig = {
  plugins: [markdown({ markedOptions }), sveltekit()],
  optimizeDeps: {
    include: ['highlight.js', 'highlight.js/lib/core']
  }
}

export default config
