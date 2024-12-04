/** @type {Lib['mkLog']} */
const mkLog =
  (namespace) =>
  /**
   * @param {...any} s
   * @returns
   */
  (...s) =>
    console.log(
      `[${namespace}]`,
      ...s.map((p) => {
        if (typeof p === 'object') return JSON.stringify(p, null, 2)
        return p
      }),
    )

module.exports = {
  mkLog,
}
