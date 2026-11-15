import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import type { UserConfig } from 'vite'

const isProd = process.env.NODE_ENV === 'production'
/**
 * PH_DEV_PLAIN=1: plain http://127.0.0.1:5174 with normal HMR (frontend-only dev against the live backend, no lvh.me
 * proxy).
 */
const plain = !!process.env.PH_DEV_PLAIN
const config: UserConfig = {
  plugins: [tailwindcss(), sveltekit()],
  envPrefix: 'PUBLIC_',
  envDir: isProd ? '.' : undefined,
  server: plain
    ? { port: 5174, strictPort: true, host: '127.0.0.1' }
    : {
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
