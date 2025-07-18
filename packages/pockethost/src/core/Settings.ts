import { mkSingleton, parseBoolean } from '@'
import { existsSync, mkdirSync } from 'fs'

export type SettingsCaster<TValue, TConfig = {}> = {
  stringToType: (value: string, config?: Partial<TConfig>) => TValue
  typeToString: (value: TValue, config?: Partial<TConfig>) => string
}

export type SettingsHandler<TValue> = {
  get: () => TValue
  set: (value: TValue) => void
}

export type SettingsHandlerFactory<TValue> = (key: string) => SettingsHandler<TValue>

export type SettingsMaker<TValue, TConfig = {}> = (
  _default?: TValue,
  config?: Partial<TConfig>
) => SettingsHandlerFactory<TValue>

const mkMaker =
  <TValue, TConfig = {}>(caster: SettingsCaster<TValue, TConfig>): SettingsMaker<TValue, TConfig> =>
  (_default, config) =>
  (name: string) => {
    return {
      get(): TValue {
        const v = process.env[name]
        if (typeof v === `undefined`) {
          if (typeof _default === `undefined`) throw new Error(`${name} must be defined`)
          this.set(_default)
          return this.get()
        }
        try {
          return caster.stringToType(v, config)
        } catch (e) {
          throw new Error(`${name}: ${e}`)
        }
      },
      set(v: TValue) {
        try {
          process.env[name] = caster.typeToString(v, config)
        } catch (e) {
          throw new Error(`${name}: ${e}`)
        }
      },
    }
  }

export const mkBoolean = mkMaker<boolean>({
  stringToType: (v) => parseBoolean(v),
  typeToString: (v) => `${v}`,
})

export const mkNumber = mkMaker<number>({
  stringToType: (s) => parseInt(s, 10),
  typeToString: (v) => v.toString(),
})

export const mkPath = mkMaker<string, { create: boolean; required: boolean }>({
  stringToType: (v, options) => {
    const { create = false, required = true } = options || {}
    if (create) {
      mkdirSync(v, { recursive: true })
    }
    if (required && !existsSync(v)) {
      throw new Error(`${v} must exist.`)
    }
    return v
  },
  typeToString: (v, options) => {
    const { create = false, required = true } = options || {}
    if (create) {
      mkdirSync(v, { recursive: true })
    }
    if (required && !existsSync(v)) {
      throw new Error(`${v} must exist.`)
    }
    return v
  },
})

export const mkString = mkMaker<string>({
  typeToString: (v) => v,
  stringToType: (v) => v,
})

export const mkCsvString = mkMaker<string[]>({
  typeToString: (v) => v.join(','),
  stringToType: (s) =>
    s
      .split(/,/)
      .map((s) => s.trim())
      .filter((v) => !!v),
})

type Config<T> = {
  [K in keyof T]: SettingsHandlerFactory<T[K]>
}

export const SettingsService = <T extends Object>(config: Config<T>) => {
  const singleton = mkSingleton<Config<T>, T>((config) => {
    const lookup: Partial<T> = {}

    for (const key in config) {
      const handler = config[key as keyof T](key)
      Object.defineProperty(lookup, key, {
        get: () => handler.get(),
        set: (value) => handler.set(value),
        enumerable: true,
      })
      handler.get() // Initialize process.env
    }

    return lookup as T
  })

  return singleton(config)
}
