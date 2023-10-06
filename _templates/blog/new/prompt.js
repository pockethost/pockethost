const { join } = require('path')
const { cwd } = require('process')

// my-generator/my-action/index.js
module.exports = {
  prompt: async ({ prompter, args }) => {
    const { execSync } = require('child_process')

    const commitsSinceLast = execSync(
      `git log $(git describe --tags --abbrev=0)..HEAD --oneline`,
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
    const { factory } = await import(`@rizzdown/core`)
    const subjectMatter = `
# Change Log

* Version ${version} (${releaseType})
${summaries.map((commit) => `* ${commit}`).join('\n')}
`
    const { generate } = factory({ profilePath, subjectMatter })

    const { default: ora } = await import('ora')
    const { default: chalk } = await import('chalk')

    const spin = async (title, prompt) => {
      const spinner = ora().start(title)
      const res = await generate(prompt)
      spinner.stopAndPersist({ symbol: chalk.green(`✔︎`) })
      return res
    }

    const title = await spin(
      `Generating title...`,
      `A title for this blog post, no more than 10 words. No exaggerations or puffery. Factual.`,
    )

    const description = await spin(
      `Generating OpenGraph description...`,
      `An OpenGraph summary/description for this blog post, no more than 50 words. A call to action.`,
    )

    const body = await spin(
      `Generating body...`,
      `A multiparagraph summary and digest of the change log, between 200-300 words, describing the benefits of the changes. Make it inviting and reassuring for new users to try out the new features.`,
    )

    return {
      commitsSinceLast,
      subjectMatter,
      version,
      releaseType,
      title,
      description,
      body,
    }
  },
}
