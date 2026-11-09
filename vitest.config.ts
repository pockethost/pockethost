import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const pockethostSrc = resolve(__dirname, 'packages/server/src')

export default defineConfig({
  test: {
    include: [
      'packages/server/src/**/*.test.ts',
      'packages/cli/src/**/*.test.ts',
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
