// Bundles the CLI into a single ESM file that runs on plain Node (no tsx at runtime).
// ssh2-sftp-client stays external: ssh2 loads optional native addons that can't be bundled.
import { build } from 'esbuild'
import { chmodSync, readFileSync, rmSync } from 'fs'

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url))
)

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true })

await build({
  entryPoints: ['src/cli.ts'],
  outfile: 'dist/cli.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: Object.keys(pkg.dependencies ?? {}),
  banner: {
    // Bundled CommonJS dependencies call require(); give them one in ESM output.
    js: "#!/usr/bin/env node\nimport { createRequire as __phCreateRequire } from 'module';\nconst require = __phCreateRequire(import.meta.url);",
  },
  logLevel: 'info',
})

chmodSync(new URL('../dist/cli.js', import.meta.url), 0o755)
