import { PackedData } from './index'
import { assertExists } from './util/assert'
import { isFunction } from './util/isFunction'

// JSON encoder to tokenize functions and store their references

export type FunctionToken = string
export const createFunctionMarshaler = () => {
  // Create a unique ID for this instance
  const nanoid = (() => {
    let i = 0
    return () => i++
  })()

  const funcCache: { [_: FunctionToken]: () => any } = {}
  const encode = (key: string, value: any) => {
    if (isFunction(value)) {
      const uuid = `fn_${nanoid()}`
      funcCache[uuid] = value
      return uuid
    }
    if (value === undefined) {
      return `ü`
    }
    return value
  }

  const exec = (tok: FunctionToken) => {
    const fn = funcCache[tok]
    assertExists(fn, `Function ${tok} does not exist`)
    const ret = fn()
    return pack(ret)
  }

  const pack = (o: any) => JSON.stringify(o, encode) as PackedData

  return { pack, exec }
}
