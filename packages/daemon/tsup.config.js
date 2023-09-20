import { defineConfig } from 'tsup'

export default defineConfig({
  noExternal: ['@s-libs/micro-dash'],
})
