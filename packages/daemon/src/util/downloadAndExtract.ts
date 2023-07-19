import { Logger, singletonAsyncExecutionGuard } from '@pockethost/common'
import decompress from 'decompress'
import decompressUnzip from 'decompress-unzip'
import { chmodSync, createWriteStream } from 'fs'
import fetch from 'node-fetch'
import { dirname } from 'path'

export function assert<T>(
  v: T | undefined | void | null,
  msg?: string
): asserts v is T {
  if (!v) {
    throw new Error(msg || `Assertion failure`)
  }
}

const downloadFile = async (url: string, path: string) => {
  const { body } = await fetch(url)
  assert(body, `Body is null`)
  const fileStream = createWriteStream(path)
  await new Promise<void>((resolve, reject) => {
    body.pipe(fileStream)
    body.on('error', reject)
    fileStream.on('finish', resolve)
  })
}

const _unsafe_downloadAndExtract = async (
  url: string,
  binPath: string,
  logger: Logger
) => {
  const { dbg, error } = logger.create('downloadAndExtract')

  dbg(`Fetching ${url}`)
  const res = await fetch(url)
  const { body } = res
  if (!body) {
    throw new Error(`Body expected for ${url}`)
  }
  const versionPath = dirname(binPath)
  const zipPath = `${versionPath}.zip`
  dbg(`Extracting ${url} to ${zipPath}`)
  await downloadFile(url, zipPath)
  await decompress(zipPath, versionPath, { plugins: [decompressUnzip()] })
  chmodSync(binPath, 0o775)
}

export const downloadAndExtract = singletonAsyncExecutionGuard(
  _unsafe_downloadAndExtract,
  (url) => url
)
