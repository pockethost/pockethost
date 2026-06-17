import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const pockethostSrc = resolve(__dirname, 'packages/pockethost/src')

export default defineConfig({
  test: {
    include: [
      'packages/pockethost/src/**/*.test.ts',
      'packages/phio/src/**/*.test.ts',
      'packages/dashboard/src/**/*.test.ts',
    ],
    environment: 'node',
  },
  resolve: {
    alias: {
      src: pockethostSrc,
      '@': resolve(pockethostSrc, 'index.ts'),
    },
  },
})
