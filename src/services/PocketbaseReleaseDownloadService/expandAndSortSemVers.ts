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

export function expandAndSortSemVers(semvers: string[]): string[] {
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
