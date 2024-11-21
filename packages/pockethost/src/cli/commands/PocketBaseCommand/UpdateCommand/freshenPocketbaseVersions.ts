import { writeFileSync } from 'fs'
import { prerelease, satisfies } from 'semver'
import {
  LoggerService,
  MOTHERSHIP_HOOKS_DIR,
  PH_ALLOWED_POCKETBASE_SEMVER,
  stringify,
} from '../../../..'
import { GobotService } from '../../../../services/GobotService'

function compareSemVer(a: string, b: string): number {
  // Consider wildcards as higher than any version number, hence represented by a large number for comparison
  let splitA = a
    .split('.')
    .map((x) => (x === '*' ? Number.MAX_SAFE_INTEGER : parseInt(x)))
  let splitB = b
    .split('.')
    .map((x) => (x === '*' ? Number.MAX_SAFE_INTEGER : parseInt(x)))

  // Compare each part starting from major, minor, then patch
  for (let i = 0; i < 3; i++) {
    if (splitA[i] !== splitB[i]) {
      return splitB[i]! - splitA[i]! // For descending order, compare b - a
    }
  }

  // If all parts are equal or both have wildcards
  return 0
}

function expandAndSortSemVers(semvers: string[]): string[] {
  let expandedVersions = new Set<string>() // Use a set to avoid duplicates

  // Helper function to add wildcard versions
  const addWildcards = (version: string) => {
    const parts = version.split('.')

    if (parts.length === 3) {
      if (parts[0] !== '0') expandedVersions.add(`${parts[0]}.*.*`)
      expandedVersions.add(`${parts[0]}.${parts[1]}.*`)
      if (parts[0] === '0' && parts[1] !== '0')
        expandedVersions.add(`0.${parts[1]}.*`)
    }
  }

  // Add wildcards and original versions to the set
  semvers.forEach((version) => {
    expandedVersions.add(version)
    addWildcards(version)
  })

  // Add the global wildcard for the latest version
  // expandedVersions.add('*')
  // Convert the set to an array and sort it using the custom semver comparison function
  return Array.from(expandedVersions).sort(compareSemVer)
}

export async function freshenPocketbaseVersions() {
  const { info } = LoggerService().create(`freshenPocketbaseVersions`)

  const { gobot } = await GobotService()

  info(`Updating pocketbase`)
  const bot = await gobot(`pocketbase`)
  await bot.update()
  await bot.download()
  const rawVersions = await bot.versions()
  const allowedVersions = rawVersions.filter(
    (v) =>
      satisfies(v, PH_ALLOWED_POCKETBASE_SEMVER()) && prerelease(v) === null,
  )
  const versions = expandAndSortSemVers(allowedVersions)
  const cjs = `module.exports = ${stringify(versions, null, 2)}`

  {
    const path = MOTHERSHIP_HOOKS_DIR(`versions.cjs`)
    info(`Writing to ${path}`)
    writeFileSync(path, cjs)
  }
  {
    const path = bot.cachePath(`versions.cjs`)
    info(`Writing to ${path}`)
    writeFileSync(path, cjs)
  }
  return cjs
}
