import { Logger } from '@pockethost/common'
import { chmodSync } from 'fs'
import fetch from 'node-fetch'
import { dirname } from 'path'
import { Extract } from 'unzipper'

export const downloadAndExtract = async (
  url: string,
  binPath: string,
  logger: Logger
) => {
  const { dbg, error } = logger.create('downloadAndExtract')

  await new Promise<void>(async (resolve, reject) => {
    dbg(`Fetching ${url}`)
    const res = await fetch(url)
    if (!res.body) {
      throw new Error(`Body expected for ${url}`)
    }
    dbg(`Extracting ${url}`)
    const stream = res.body.pipe(Extract({ path: dirname(binPath) }))
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
