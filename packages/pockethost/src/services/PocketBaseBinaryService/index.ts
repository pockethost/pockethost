import { LoggerService, mkSingleton, PH_ALLOWED_POCKETBASE_SEMVER, PH_POCKETBASE_ROOT, SingletonBaseConfig } from '@'
import { chmodSync, createWriteStream, existsSync, readdirSync, rmSync } from 'fs'
import { mkdir } from 'fs/promises'
import { spawn, type ChildProcess } from 'node:child_process'
import { Readable } from 'node:stream'
import { join } from 'path'
import { compare, valid } from 'semver'
import { spawnPocketBaseContainer } from './dockerSpawn'
import { extractPocketBaseZip } from './extractZip'
import { maxSatisfyingVersionFromList } from './maxSatisfyingVersion'
import { mkAssetName, mkAssetSuffix, mkBinaryName, mkContainerPlatform, needsContainerRuntime } from './platform'
import { fetchPocketBaseReleases, findReleaseAsset, latestPerMinor } from './releases'
import { mkVersionCatalog, mkVersionCatalogFromPatches, syncMothershipVersions } from './syncMothershipVersions'

export type PocketBaseBinaryServiceConfig = SingletonBaseConfig

export type PocketBaseRunOptions = {
  env?: Record<string, string>
  cwd?: string
  /** Host paths bind-mounted at the same path inside the container (for one-shot CLI on macOS). */
  binds?: string[]
}

export const createPocketBaseBinaryService = (config: PocketBaseBinaryServiceConfig) => {
  const { dbg, info } = (config.logger ?? LoggerService()).create('PocketBaseBinaryService')
  const platform = mkContainerPlatform()
  const assetSuffix = mkAssetSuffix(platform)
  const binaryName = mkBinaryName(platform)

  const getBinaryPath = (version: string) => PH_POCKETBASE_ROOT(version, assetSuffix, binaryName)

  const listCachedVersions = () =>
    readdirSync(PH_POCKETBASE_ROOT(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((version) => valid(version) && existsSync(getBinaryPath(version)))
      .sort(compare)
      .reverse()

  const versions = () => listCachedVersions()

  const maxSatisfyingVersion = (range: string) => maxSatisfyingVersionFromList(versions(), range)

  const resolveVersion = (range: string) => {
    const resolved = maxSatisfyingVersion(range)
    if (!resolved) {
      throw new Error(`No PocketBase version satisfying ${range}`)
    }
    return resolved
  }

  const downloadVersion = async (version: string, releases: Awaited<ReturnType<typeof fetchPocketBaseReleases>>) => {
    const binPath = getBinaryPath(version)
    if (existsSync(binPath)) {
      dbg(`Already downloaded ${version}`)
      return binPath
    }

    const tag = version.startsWith('v') ? version : `v${version}`
    const release = releases.find((entry) => entry.tag_name.toLowerCase() === tag.toLowerCase())
    if (!release) {
      throw new Error(`Release not found for PocketBase ${version}`)
    }

    const assetName = mkAssetName(version, platform)
    const asset = findReleaseAsset(release, assetName)
    if (!asset) {
      throw new Error(`Asset ${assetName} not found for PocketBase ${version}`)
    }

    const versionDir = PH_POCKETBASE_ROOT(version, assetSuffix)
    const tmpDir = PH_POCKETBASE_ROOT(`.tmp`, version)
    const zipPath = join(tmpDir, assetName)

    info(`Downloading PocketBase ${version} (${assetSuffix})`)
    await mkdir(tmpDir, { recursive: true })

    const res = await fetch(asset.browser_download_url)
    if (!res.ok) {
      throw new Error(`Download failed for PocketBase ${version} (${res.status})`)
    }
    const body = res.body
    if (!body) {
      throw new Error(`Download failed for PocketBase ${version} (empty body)`)
    }

    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(zipPath)
      const nodeBody = Readable.fromWeb(body)
      nodeBody.pipe(out)
      out.on('finish', () => resolve())
      out.on('error', reject)
      nodeBody.on('error', reject)
    })

    await mkdir(versionDir, { recursive: true })
    await extractPocketBaseZip(zipPath, versionDir, binaryName)

    if (!existsSync(binPath)) {
      throw new Error(`Extracted binary missing at ${binPath}`)
    }

    if (platform.os !== 'windows') {
      chmodSync(binPath, 0o755)
    }

    rmSync(tmpDir, { recursive: true, force: true })
    info(`Downloaded PocketBase ${version} -> ${binPath}`)
    return binPath
  }

  const downloadAll = async () => {
    const releases = await fetchPocketBaseReleases()
    const targets = latestPerMinor(releases, PH_ALLOWED_POCKETBASE_SEMVER())
    info(`Downloading ${targets.length} PocketBase versions (${assetSuffix})`)

    for (const version of targets) {
      await downloadVersion(version.format(), releases)
    }

    return targets.map((version) => version.format())
  }

  const freshen = async () => {
    const releases = await fetchPocketBaseReleases()
    const targets = latestPerMinor(releases, PH_ALLOWED_POCKETBASE_SEMVER())

    info(`Updating ${targets.length} PocketBase versions (${assetSuffix})`)
    for (const version of targets) {
      await downloadVersion(version.format(), releases)
    }

    await syncMothershipVersions(mkVersionCatalog(targets))
  }

  const ensureBinary = async (versionRange: string) => {
    const version = resolveVersion(versionRange)
    const binPath = getBinaryPath(version)
    if (!existsSync(binPath)) {
      const releases = await fetchPocketBaseReleases()
      await downloadVersion(version, releases)
    }
    return getBinaryPath(version)
  }

  const run = async (
    versionRange: string,
    args: string[],
    options: PocketBaseRunOptions = {},
    onSpawn?: (proc: ChildProcess) => void
  ) => {
    const version = resolveVersion(versionRange)
    const binPath = await ensureBinary(version)

    if (needsContainerRuntime()) {
      if (onSpawn) {
        throw new Error('PocketBase container spawn does not support onSpawn; use spawnPocketBaseContainer')
      }

      return new Promise<number>((resolve) => {
        const binds = options.binds ?? []
        if (options.cwd) {
          binds.push(`${options.cwd}:${options.cwd}`)
        }
        spawnPocketBaseContainer({
          binPath,
          args,
          binds,
          env: options.env,
          autoRemove: true,
          onStdout: (chunk) => process.stdout.write(chunk),
          onStderr: (chunk) => process.stderr.write(chunk),
          onExit: (code) => resolve(code),
        }).catch(() => resolve(1))
      })
    }

    const proc = spawn(binPath, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: onSpawn ? 'pipe' : 'inherit',
    })

    if (onSpawn) {
      onSpawn(proc)
      return
    }

    return new Promise<number>((resolve) => {
      proc.on('close', (code) => resolve(code ?? 1))
    })
  }

  return {
    platform,
    versions,
    maxSatisfyingVersion,
    getBinaryPath,
    downloadAll,
    freshen,
    run,
    ensureBinary,
    needsContainerRuntime,
  }
}

export type PocketBaseBinaryServiceApi = ReturnType<typeof createPocketBaseBinaryService>

export const PocketBaseBinaryService = mkSingleton(createPocketBaseBinaryService)

export const freshenPocketbaseVersions = async () => {
  await PocketBaseBinaryService().freshen()
}

export { rmNamedContainerSync, spawnPocketBaseContainer } from './dockerSpawn'

export const syncCachedVersionsToMothership = async () => {
  const { info, warn } = LoggerService().create('syncCachedVersionsToMothership')
  const patches = PocketBaseBinaryService().versions()

  if (!patches.length) {
    warn(`No cached pocketbase versions to sync`)
    return
  }

  const catalog = mkVersionCatalogFromPatches(patches)
  if (await syncMothershipVersions(catalog)) {
    info(`Synced ${catalog.length} pocketbase versions from cache`)
  }
}
