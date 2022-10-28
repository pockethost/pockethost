import { forEach, isObject } from '@s-libs/micro-dash'

export const mergeDeep = <TObject>(dst: any, src: TObject) => {
  forEach(src, (v, k) => {
    if (isObject(v)) {
      if (dst[k] === undefined) dst[k] = {}
      if (!isObject(dst[k])) {
        throw new Error(
          `${k.toString()} is an object in default, but not in target`
        )
      }
      dst[k] = mergeDeep(dst[k], v)
    } else {
      if (isObject(dst[k])) {
        throw new Error(
          `${k.toString()} is an object in target, but not in default`
        )
      }
      // The magic: if the target has no value for this field, use the
      // default value
      if (dst[k] === undefined) {
        dst[k] = v
      }
    }
  })
  return dst as TObject
}
