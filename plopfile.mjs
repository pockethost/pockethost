import chalk from 'chalk'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import inquirer from 'inquirer'
import yaml from 'js-yaml'
import ora from 'ora'
import { join } from 'path'
import { cwd } from 'process'
import factory from 'rizzdown'
import pkg from './package.json' assert { type: 'json' }
const { version } = pkg

/** @typedef {import('plop').NodePlopAPI} Plop */

const mkAIGenerator = (/** @type {string} */ subjectMatter) => {
  const profilePath = join(cwd(), `.rizzdown/blog`)
  const { generate } = factory({ profilePath, subjectMatter })

  return async (/** @type {string} */ title, /** @type {string} */ prompt) => {
    const spinner = ora().start(title)
    const res = await generate(prompt, {})
    spinner.stopAndPersist({ symbol: chalk.green(`✔︎`) })
    return res
  }
}

export default function (/** @type {Plop} */ plop) {
  plop.setHelper('isoTimestamp', function () {
    return new Date().toISOString()
  })

  plop.setHelper('yamlEncode', function (text) {
    return yaml.dump(text).trim()
  })

  plop.setGenerator('blog-article', {
    description: 'Generate a new blog article',
    prompts: [
      {
        type: 'input',
        name: 'synopsis',
        message: '30-50 word synopsis of the news you wish to announce',
      },
    ],
    actions: [
      async function (data) {
        const profilePath = join(cwd(), `.rizzdown/blog`)
        const subjectMatter = data.synopsis

        const { factory } = await import('rizzdown')
        const { generate } = factory({ profilePath, subjectMatter })

        const spin = async (title, prompt) => {
          const spinner = ora().start(title)
          const res = await generate(prompt, {})
          spinner.stopAndPersist({ symbol: chalk.green(`✔︎`) })
          return res
        }

        data.title = await spin(
          `Generating title...`,
          `A title for this blog post, no more than 10 words. No exaggerations or puffery. Factual. ASCII characters only. Do not enclose in quotations.`,
        )

        data.description = await spin(
          `Generating description...`,
          `An OpenGraph summary/description for this blog post, no more than 50 words. A call to action. Factual. ASCII characters only.`,
        )

        data.summary = await spin(
          `Generating summary...`,
          `A one-paragraph introductory summary. ASCII characters only.`,
        )

        data.detail = await spin(
          `Generating detail...`,
          `A detailed analysis of the importance and use of this news. ASCII characters only.`,
        )

        console.log({ data })
      },
      {
        type: 'add',
        path: 'packages/lander/content/blog/{{dashCase title}}.md',
        templateFile: 'plop-templates/blog.hbs',
      },
    ],
  })

  plop.setGenerator('release', {
    description: 'Generate a new release',
    prompts: [],
    actions: (data) => {
      if (!data) throw new Error(`data expected`)
      return [
        async () => {
          const commitsSinceLast = execSync(
            `git log $(git describe --tags --abbrev=0)..HEAD --oneline | grep -E "fix:|enh:|feat:|docs:|chore:" | sed 's/^[^ ]*/\*/' | sort`,
          )
            .toString()
            .replace(/^\S+?\s/gm, '')
            .split(/\n/)
            .filter((v) => !!v)

          console.log(`Commits since last release:`)
          commitsSinceLast.forEach((line) => console.log(`  * ${line}`))

          const { releaseType } = await inquirer.prompt({
            type: 'list',
            name: 'releaseType',
            choices: ['major', 'minor', 'patch'],
            message: `What type of release is this?`,
            default: 2,
          })

          execSync(`npm version --no-git-tag-version ${releaseType}`)
          const { version } = JSON.parse(
            readFileSync(join(cwd(), './package.json')).toString(),
          )
          console.log(
            `Great, a ${releaseType} release. The new version will be ${version}.`,
          )

          const summaries = commitsSinceLast
            .map((commit) => `* ${commit}`)
            .join(`\n`)
          // const summaries = []
          // // for (let i = 0; i < commitsSinceLast.length; i++) {
          // //   const commit = commitsSinceLast[i]
          // //   const { summary } = await inquirer.prompt({
          // //     type: 'input',
          // //     name: 'summary',
          // //     message: `Please summarize this commit log (enter to leave as is):`,
          // //     default: commit,
          // //   })
          // //   summaries.push(summary)
          // // }
          // summaries.push(...commitsSinceLast)

          // const summary = await (async () => {
          //   const _summary = await mkAIGenerator(summaries)(
          //     `Generating commit summary...`,
          //     `Using semver parlance, this is a ${releaseType} release of PocketHost. What follows are the git commit messages for this ${releaseType} release. Please provide a one-paragraph summary under 50 words based on git commit messages. Factual. ASCII characters only. Use reflective and dry technical language, no calls to action or 'consumer' sounding language.`,
          //   )

          //   const { summary } = await inquirer.prompt({
          //     type: 'input',
          //     name: 'summary',
          //     message: `What is this release about, generally?`,
          //     default: _summary,
          //   })
          //   return summary
          // })()

          const generate = mkAIGenerator(
            `# PocketHost v${version} release\n\n###Detailed updates\n\n${summaries}`,
          )

          data.version = version

          data.title = `PocketHost v${version}`

          data.opengraph = await generate(
            `Generating OpenGraph description...`,
            `An OpenGraph summary for this release, no more than 50 words. Factual. ASCII characters only. Use reflective and dry technical language, no calls to action or 'consumer' sounding language.`,
          )

          data.summary = await generate(
            `Generating key updates summary...`,
            `A bullet point summary of items tagged as 'feat' or 'fix'. Features come first. No more than 50 words TOTAL for the whole list. Factual. ASCII characters only. Use reflective and dry technical language, no calls to action or 'consumer' sounding language.`,
          )

          data.overview = await generate(
            `Generating overview...`,
            `1-3 short paragraphs organizing the major changes and discussing their importance. ASCII characters only. Use reflective and dry technical language, no calls to action or 'consumer' sounding language`,
          )

          data.change_log = summaries
        },
        {
          type: 'add',
          path: 'packages/lander/content/blog/{{dashCase title}}.md',
          templateFile: 'plop-templates/blog.hbs',
        },
      ]
    },
  })

  plop.setGenerator('plugin', {
    description: 'Generate a new plugin',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Plugin Name (dash case)',
      },
    ],
    actions: (data) => {
      data.version = version
      return [
        {
          type: 'addMany',
          destination: 'packages/plugin-{{dashCase name}}',
          base: 'packages/plugin-template',
          templateFiles: `packages/plugin-template/**/*`,
        },
        async () => {
          console.log(execSync(`pnpm i`).toString())
        },
      ]
    },
  })
}
