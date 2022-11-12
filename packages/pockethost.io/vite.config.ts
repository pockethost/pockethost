import { sveltekit } from '@sveltejs/kit/vite'
import type { UserConfig } from 'vite'
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const packageFile = JSON.parse(json);
const packageVersion = JSON.stringify(packageFile.version)

const config: UserConfig = {
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['highlight.js', 'highlight.js/lib/core']
  },
  define: {
    __PACKAGE_VERSION__: packageVersion
  }
}

export default config
