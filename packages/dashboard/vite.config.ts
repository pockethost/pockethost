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
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      clientPort: 5174,
    },
  },
}

export default config
