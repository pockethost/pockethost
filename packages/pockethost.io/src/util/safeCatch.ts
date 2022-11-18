import { dev } from '$app/environment'

export const safeCatch = <TIn extends any[], TOut>(
  name: string,
  cb: (...args: TIn) => Promise<TOut>
) => {
  return (...args: TIn) => {
    if (dev) {
      //console.log(`${name}`)
    }
    return cb(...args).catch((e: any) => {
      console.error(`${name} failed: ${e}`)
      throw e
    })
  }
}
