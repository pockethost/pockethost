#!/usr/bin/env tsx
import { execSync } from 'child_process'
import { sync } from 'conventional-commits-parser'
import fs, { readFileSync } from 'fs'
import minimist from 'minimist'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRootDir = join(__dirname, `../..`)

const argv = minimist(process.argv.slice(2))
const commitMessage = argv._[0]!
const { type, subject } = sync(commitMessage)
if (!type) {
  console.log('Invalid commit message type')
  process.exit(1)
}

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
  const packageJsonPath = join(repoRootDir, `${packagePath}/package.json`)
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

  const prefixMap = {
    feat: 'minor',
    enh: 'minor',
    fix: 'patch',
    docs: 'patch',
    chore: 'patch',
  } as const

  if (!(type! in prefixMap)) {
    console.log('Invalid prefix found in commit message')
    process.exit(1)
  }

  const versionType = prefixMap[type as keyof typeof prefixMap]

  const changesetFile = [
    `---`,
    ...packageNames.map((packageName) => `'${packageName}': ${versionType}`),
    `---`,
    ``,
    subject,
  ].join('\n')
  return changesetFile
}

async function writeChangesetFile(changesetFile: string) {
  const filePath = join(repoRootDir, `.changeset`, `${+new Date()}.md`)
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
  execSync(`git commit -m "${commitMessage}"`)
}

async function main() {
  const changesetFile = await createChangesetFile()
  await writeChangesetFile(changesetFile)
  commit()
}

main()
