import chalk from 'chalk'
import { execSync } from 'child_process'
import yaml from 'js-yaml'
import ora from 'ora'
import { join } from 'path'
import { cwd } from 'process'

export default function (plop) {
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
        path: 'frontends/lander/content/blog/{{dashCase title}}.md',
        templateFile: 'plop-templates/blog.hbs',
      },
    ],
  })

  plop.setGenerator('blog-release', {
    description: 'Generate a new release announcement',
    prompts: [],
    actions: [
      async function (data) {
        const commitsSinceLast = execSync(
          `git log $(git describe --tags --abbrev=0)..HEAD --oneline | grep -E "fix:|enh:|feat:" | sed 's/^[^ ]*/\*/' filename | sort`,
        )
          .toString()
          .replace(/^\S+?\s/gm, '')
          .split(/\n/)
          .filter((v) => !!v)

        console.log(`Commits since last release:`)

        commitsSinceLast.forEach((line) => console.log(`  * ${line}`))
        const { releaseType } = await prompter.prompt({
          type: 'select',
          name: 'releaseType',
          choices: ['major', 'minor', 'patch'],
          message: `What type of release is this?`,
          initial: 2,
        })
        execSync(`yarn version --no-git-tag-version --${releaseType}`)
        const version = require(join(cwd(), './package.json')).version
        console.log(
          `Great, a ${releaseType} release. The new version will be ${version}.`,
        )

        const summaries = []
        for (i = 0; i < commitsSinceLast.length; i++) {
          const commit = commitsSinceLast[i]
          const { summary } = await prompter.prompt({
            type: 'input',
            name: 'summary',
            message: `Please summarize this commit log (enter to leave as is):`,
            initial: commit,
          })
          summaries.push(summary)
        }

        const profilePath = join(cwd(), `.rizzdown/blog`)
        const subjectMatter = data.synopsis

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
        path: 'frontends/lander/content/blog/{{dashCase title}}.md',
        templateFile: 'plop-templates/blog.hbs',
      },
    ],
  })
}
