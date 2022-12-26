import { existsSync, readFileSync, writeFileSync } from 'fs'
import fetch from 'node-fetch'
import { dbg } from './logger'

export const smartFetch = async <TRet>(
  url: string,
  path: string
): Promise<TRet> => {
  const res = await fetch(url)
  if (res.status !== 200) {
    if (!existsSync(path)) {
      throw new Error(`API down and no cache`)
    }
    dbg(`Using data from cache`)
    return JSON.parse(readFileSync(path).toString()) as TRet
  }
  const data = await res.json()
  writeFileSync(path, JSON.stringify(data))
  return data as TRet
}
