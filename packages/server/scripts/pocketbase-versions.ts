/**
 * Manual maintenance of src/services/PocketBaseBinaryService/versions.json. The `pocketbase check` PM2 job already adds
 * new upstream releases on its own; use this to add or refresh specific versions by hand.
 *
 * - `pnpm pb:versions add 0.41.2 [0.22.59 ...]`: add or refresh releases. Releases without checksums.txt are hashed from
 *   the downloads.
 * - `pnpm pb:versions check`: list upstream releases missing from the manifest (exit 1 if any).
 */
import { addVersions, readManifest } from '../src/services/PocketBaseBinaryService/manifest'
import { fetchUpstreamVersions, findMissingVersions } from '../src/services/PocketBaseBinaryService/upstream'

const add = async (versions: string[]) => {
  const { added, failed } = await addVersions(versions, { allowHashFallback: true })
  for (const { version, host, platforms, hadChecksums } of added) {
    console.log(`${version}: ${host} [${platforms.join(', ')}]${hadChecksums ? '' : ' (no checksums.txt, hashed)'}`)
  }
  for (const { version, reason } of failed) console.error(`${version}: ${reason}`)
  if (failed.length) process.exitCode = 1
}

const check = async () => {
  const missing = findMissingVersions(Object.keys(readManifest().versions), await fetchUpstreamVersions())
  if (!missing.length) {
    console.log('Manifest is up to date with upstream tags.')
    return
  }
  console.log(`Missing upstream releases: ${missing.join(' ')}`)
  console.log(`Add them with: pnpm pb:versions add ${missing.join(' ')}`)
  process.exitCode = 1
}

const [command, ...args] = process.argv.slice(2)
if (command === 'add' && args.length) await add(args)
else if (command === 'check') await check()
else {
  console.error('Usage: pb:versions add <version...> | check')
  process.exitCode = 2
}
