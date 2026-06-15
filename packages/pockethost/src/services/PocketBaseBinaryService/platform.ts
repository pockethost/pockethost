export type PocketBasePlatform = {
  os: 'darwin' | 'linux' | 'windows'
  arch: 'amd64' | 'arm64'
}

const mkArch = (): PocketBasePlatform['arch'] => {
  if (process.arch === 'x64') return 'amd64'
  if (process.arch === 'arm64') return 'arm64'
  throw new Error(`Unsupported architecture: ${process.arch}`)
}

export const mkHostPlatform = (): PocketBasePlatform => {
  const os = (() => {
    if (process.platform === 'darwin') return 'darwin' as const
    if (process.platform === 'linux') return 'linux' as const
    if (process.platform === 'win32') return 'windows' as const
    throw new Error(`Unsupported platform: ${process.platform}`)
  })()

  return { os, arch: mkArch() }
}

/** Linux target matching Docker Desktop / Linux edge nodes (arm64 on Apple Silicon, amd64 on x64). */
export const mkContainerPlatform = (): PocketBasePlatform => ({ os: 'linux', arch: mkArch() })

export const needsContainerRuntime = () => {
  const host = mkHostPlatform()
  const container = mkContainerPlatform()
  return host.os !== container.os || host.arch !== container.arch
}

export const mkAssetSuffix = (platform: PocketBasePlatform) => `${platform.os}_${platform.arch}`

export const mkAssetName = (version: string, platform: PocketBasePlatform) =>
  `pocketbase_${version}_${mkAssetSuffix(platform)}.zip`

export const mkBinaryName = (platform: PocketBasePlatform) =>
  platform.os === 'windows' ? 'pocketbase.exe' : 'pocketbase'
