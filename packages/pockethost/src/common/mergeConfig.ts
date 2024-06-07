/**
 * Merges a config object with defaults. Shallow copies root descendants,
 * skipping`undefined` values.
 *
 * @param defaultConfig The default config values
 * @param partialConfigs A partial config to merge with defaults
 * @returns
 */
export function mergeConfig<T>(
  defaultConfig: T,
  ...partialConfigs: Partial<T>[]
): T {
  const result: T = { ...defaultConfig }

  for (const partialConfig of partialConfigs) {
    for (const key in partialConfig) {
      if (Object.prototype.hasOwnProperty.call(partialConfig, key)) {
        const value = partialConfig[key as keyof typeof partialConfig]
        if (value !== undefined) {
          result[key as keyof T] = value as T[keyof T]
        }
      }
    }
  }

  return result
}
