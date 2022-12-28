import { logger } from '@pockethost/common'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import fetch from 'node-fetch'
import { dirname } from 'path'

export const smartFetch = async <TRet>(
  url: string,
  path: string
): Promise<TRet> => {
  const { dbg } = logger().create(`smartFetch`)

  const data = await (async () => {
    try {
      const res = await fetch(url)
      if (res.status !== 200) {
        throw new Error(`API appears to be down`)
      }
      const data = (await res.json()) as TRet
      return data
    } catch (e) {
      dbg(`Caught error on fetch: ${e}`)
      if (!existsSync(path)) {
        throw new Error(`API down and no cache`)
      }
      dbg(`Using data from cache`)
      return JSON.parse(readFileSync(path).toString()) as TRet
    }
  })()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
  return data as TRet
}
