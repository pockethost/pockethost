import { exec } from 'child_process'
import fs from 'fs/promises'
import { Listr, ListrTask } from 'listr2'
import { createRequire } from 'module'
import fetch from 'node-fetch'
import semver from 'semver'
import util from 'util'

const execPromise = util.promisify(exec)
const require = createRequire(import.meta.url)

export async function getPackageJson(packageName: string): Promise<any | null> {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`)
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
    return packageJson
  } catch (error) {
    return null
  }
}

export async function fetchPackageData(
  packageName: string,
): Promise<any | null> {
  const npmRegistryUrl = `https://registry.npmjs.org/${packageName}`
  try {
    const response = await fetch(npmRegistryUrl)
    return await response.json()
  } catch (error) {
    return null
  }
}

async function installPackage(
  packageName: string,
  version: string,
): Promise<void> {
  try {
    await execPromise(`npm install -g ${packageName}@${version}`)
  } catch (e) {
    throw new Error(`Error installing ${packageName}@${version}: ${e}`)
  }
}

export async function removePackage(packageName: string): Promise<void> {
  try {
    await execPromise(`npm remove -g ${packageName}`)
  } catch (e) {
    throw new Error(`Error removing ${packageName}: ${e}`)
  }
}

async function checkPackageCompatibility(
  packageA: string,
  versionA: string,
  packageB: string,
): Promise<string> {
  const localPackageJson = await getPackageJson(packageB)

  if (localPackageJson) {
    const { version: localPackageBVersion, dependencies } = localPackageJson

    if (dependencies && semver.satisfies(versionA, dependencies[packageA])) {
      return `Local ${packageB}@${localPackageBVersion} is already compatible with ${packageA}@${versionA}`
    }
  }

  const packageBData = await fetchPackageData(packageB)
  if (!packageBData) {
    throw new Error(`Error fetching data for ${packageB}`)
  }

  const versions = packageBData.versions
  let latestCompatibleVersion: string | null = null

  for (const version in versions) {
    const dependencies = versions[version].dependencies
    if (
      dependencies &&
      packageA in dependencies &&
      semver.satisfies(versionA, dependencies[packageA])
    ) {
      if (
        !latestCompatibleVersion ||
        semver.gt(version, latestCompatibleVersion)
      ) {
        latestCompatibleVersion = version
      }
    }
  }

  if (latestCompatibleVersion) {
    await installPackage(packageB, latestCompatibleVersion)
    return `${packageB}@${latestCompatibleVersion} installed successfully`
  } else {
    throw new Error(
      `No compatible version of ${packageB} found for ${packageA}@${versionA}`,
    )
  }
}

export async function getCompatibleVersions(
  packageA: string,
  versionA: string,
  packagesB: string[],
): Promise<void> {
  const tasks = packagesB.map(
    (packageB) =>
      ({
        title: `Checking ${packageB}...`,
        task: async (_, task) => {
          try {
            const result = await checkPackageCompatibility(
              packageA,
              versionA,
              packageB,
            )
            task.output = result
          } catch (error) {
            task.output = `${error}`
            throw error
          }
        },
      }) as ListrTask,
  )

  const listr = new Listr(tasks, {
    concurrent: true,
    rendererOptions: { collapseSubtasks: false },
  })

  await listr.run()
}

// Example usage
// const packageA = 'express'
// const versionA = '4.17.1'
// const packagesB = ['some-package', 'another-package', 'yet-another-package']

// getCompatibleVersions(packageA, versionA, packagesB)
