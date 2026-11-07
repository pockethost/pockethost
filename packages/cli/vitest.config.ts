import { defineConfig } from 'vitest/config'

// Used by `pnpm --filter pockethost test` (and prepublishOnly). The repo-root
// vitest.config.ts covers these tests too when running `pnpm test` at the root.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
