import { ClientResponseError } from 'pocketbase'

export const safeCatch = <TIn extends any[], TOut>(
  name: string,
  cb: (...args: TIn) => Promise<TOut>
) => {
  return (...args: TIn) => {
    console.log(`${name}`)
    return cb(...args).catch((e: any) => {
      if (e instanceof ClientResponseError) {
        console.error(`PocketBase API error ${e}`)
        console.error(JSON.stringify(e.data, null, 2))
        if (e.status === 400) {
          console.error(
            `It looks like you don't have permission to make this request.`
          )
        }
      } else {
        console.error(`${name} failed: ${e}`)
      }
      console.error(e)
      throw e
    })
  }
}
