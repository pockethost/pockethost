import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @typedef {import('plop').NodePlopAPI} Plop */

export default function (/** @type {Plop} */ plop) {
  plop.setGenerator('plugin', {
    description: 'Generate a new plugin',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Plugin Name (dash case)',
      },
      {
        type: 'input',
        name: 'version',
        message: 'PocketHost base version',
      },
    ],
    actions: (data) => {
      return [
        {
          type: 'addMany',
          destination: 'plugin-{{dashCase name}}',
          base: join(__dirname, 'plugin-template'),
          templateFiles: join(__dirname, `plugin-template/**/*`),
        },
        async () => {
          console.log(execSync(`pnpm i`).toString())
        },
      ]
    },
  })
}
