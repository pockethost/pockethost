export type Logger = (...args: any[]) => void

export type StringKvLookup = { [_: string]: string }

export const mkLog =
  (namespace: string) =>
  (...s: any[]) =>
    console.log(
      `[${namespace}]`,
      ...s.map((p) => {
        if (typeof p === 'object') return JSON.stringify(p, null, 2)
        return p
      })
    )

export const dbg = (...args: any[]) => console.log(args)

export const interpolateString = (template: string, dict: StringKvLookup) => {
  return template.replace(/\{\$(\w+)\}/g, (match, key) => {
    dbg({ match, key })
    const lowerKey = key.toLowerCase()
    return dict.hasOwnProperty(lowerKey) ? dict[lowerKey] || '' : match
  })
}
