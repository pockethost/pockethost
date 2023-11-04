import chalk from 'chalk'
import yaml from 'js-yaml'
import ora from 'ora'
import { join } from 'path'
import { cwd } from 'process'
import { factory } from 'rizzdown'

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
