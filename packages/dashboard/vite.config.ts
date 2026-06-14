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
    host: 'pockethost.lvh.me',
    hmr: {
      protocol: 'wss',
      host: 'pockethost.lvh.me',
      clientPort: 443,
    },
  },
}

export default config
