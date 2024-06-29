#!/usr/bin/env tsx

import { execSync } from 'child_process'
import fs, { readFileSync } from 'fs'
import inquirer from 'inquirer'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let commitMessage = ''
function getStagedPackageNames(filePaths: string[]): string[] {
  const packageNames = new Set<string>()

  filePaths.forEach((filePath) => {
    const packageName = getPackageName(filePath)
    if (packageName) {
      packageNames.add(packageName)
    }
  })

  return Array.from(packageNames)
}

function getPackageName(filePath: string): string | null {
  const packagePath = filePath.split('/').slice(0, 2).join('/')
  const packageJsonPath = join(__dirname, `${packagePath}/package.json`)
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  try {
    return packageJson.name
  } catch (error) {
    return null
  }
}

function getStagedFileNames(): string[] {
  const output = execSync('git diff --name-only --cached').toString()
  const fileNames = output
    .trim()
    .split('\n')
    .filter((fileName) => fileName.startsWith(`packages/`))
  return fileNames
}

async function createChangesetFile() {
  const fileNames = getStagedFileNames()
  const packageNames = getStagedPackageNames(fileNames)

  if (packageNames.length === 0) {
    console.log('No packages staged for commit')
    process.exit(0)
  }
  console.log('Staged packages:', packageNames)

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'versionType',
      message: 'Select the version type:',
      choices: ['major', 'minor', 'patch'],
    },
    {
      type: 'input',
      name: 'commitMessage',
      message: 'Enter the commit message:',
    },
  ])

  commitMessage = answers.commitMessage
  const { versionType } = answers

  const changesetFile = [
    `---`,
    ...packageNames.map((packageName) => `'${packageName}': ${versionType}`),
    `---`,
    ``,
    commitMessage,
  ].join('\n')
  return changesetFile
}

async function writeChangesetFile(changesetFile: string) {
  const filePath = join(__dirname, `.changeset`, `${+new Date()}.md`)
  try {
    fs.writeFileSync(filePath, changesetFile)
    console.log(`Changeset file written successfully at ${filePath}`)
    execSync(`git add ${filePath}`)
    console.log(`Changeset file added to git`)
  } catch (error) {
    console.error(`Error writing changeset file: ${error}`)
  }
}

function commit() {
  execSync(`git commit -m "${commitMessage}"`).toString()
}

async function main() {
  const changesetFile = await createChangesetFile()
  await writeChangesetFile(changesetFile)
  commit()
}

main()
