import { Logger } from '@pockethost/common'
import { chmodSync } from 'fs'
import fetch from 'node-fetch'
import { dirname } from 'path'
import { Extract } from 'unzipper'
import { serialAsyncExecutionGuard } from './serialAsyncExecutionGuard'

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
  await new Promise<void>((resolve, reject) => {
    dbg(`Extracting ${url}`)
    const stream = body.pipe(Extract({ path: dirname(binPath) }))
    stream.on('data', (e) => {
      dbg(e)
    })
    stream.on('close', () => {
      dbg(`Close ${url}`)
      resolve()
    })
    stream.on('error', (e) => {
      error(`Error ${url} ${e}`)
      reject()
    })
    stream.on('end', () => {
      dbg(`End ${url}`)
      resolve()
    })
  })
  chmodSync(binPath, 0o775)
}

export const downloadAndExtract = serialAsyncExecutionGuard(
  _unsafe_downloadAndExtract,
  (url) => url
)
