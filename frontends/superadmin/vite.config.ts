import { sveltekit } from '@sveltejs/kit/vite'
import type { UserConfig } from 'vite'

const isProd = process.env.NODE_ENV === 'production'
const config: UserConfig = {
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['highlight.js', 'highlight.js/lib/core'],
  },
  envPrefix: 'PUBLIC_',
  envDir: isProd ? '.' : undefined,
}

export default config
