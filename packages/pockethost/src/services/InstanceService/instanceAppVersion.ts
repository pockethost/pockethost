export type InstanceAppVersion = 'v22' | 'v23'

export const instanceAppVersionFromPbVersion = (version: string): InstanceAppVersion => {
  const [, minor] = version.split('.').map(Number)
  if (!minor) {
    throw new Error(`Invalid version: ${version}`)
  }
  if (minor <= 22) return 'v22'
  return 'v23'
}
