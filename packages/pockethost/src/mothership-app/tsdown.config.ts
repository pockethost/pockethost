import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'mothership.pb': 'src/hooks/index.ts',
    mothership: 'src/lib/index.ts',
  },
  format: ['cjs'],
  dts: false,
  clean: false,
  outDir: 'pb_hooks',
  shims: true,
  skipNodeModulesBundle: false,
  target: 'node20',
  platform: 'node',
  minify: false,
  sourcemap: false,
  bundle: true,
})
