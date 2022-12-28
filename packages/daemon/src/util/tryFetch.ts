import { logger } from '@pockethost/common'
import { safeCatch } from './promiseHelper'

export const tryFetch = safeCatch(`tryFetch`, (url: string) => {
  const { dbg } = logger().create('tryFetch')
  return new Promise<void>((resolve, reject) => {
    const tryFetch = () => {
      dbg(`Trying to connect to instance ${url} `)
      fetch(url)
        .then(() => {
          dbg(`Connection to ${url} successful`)
          resolve()
        })
        .catch((e) => {
          dbg(`Could not connect to ${url}`)
          setTimeout(tryFetch, 1000)
        })
    }
    tryFetch()
  })
})
