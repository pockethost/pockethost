import { mkSingleton } from '$shared'
import { boolean as castToBoolean } from 'boolean'
import { existsSync, mkdirSync } from 'fs'

export type HandlerFactory<TValue> = (key: string) => {
  get: () => TValue
  set: (value: TValue) => void
}

export type Maker<TValue, TConfig = {}> = (
  _default?: TValue,
  config?: Partial<TConfig>,
) => HandlerFactory<TValue>

export const mkBoolean: Maker<boolean> = (_default) => (name: string) => {
  return {
    get() {
      const v = process.env[name]
      if (typeof v === `undefined`) {
        if (typeof _default === `undefined`)
          throw new Error(`${name} must be defined`)
        return _default
      }
      return castToBoolean(v)
    },
    set(v) {
      process.env[name] = `${v}`
    },
  }
}

export const mkNumber: Maker<number> = (_default) => (name: string) => {
  return {
    get() {
      const v = process.env[name]
      if (typeof v === `undefined`) {
        if (typeof _default === `undefined`)
          throw new Error(`${name} must be defined`)
        return _default
      }
      return parseInt(v, 10)
    },
    set(v) {
      process.env[name] = v.toString()
    },
  }
}

export const mkPath: Maker<string, { create: boolean; required: boolean }> =
  (_default, options = {}) =>
  (name: string) => {
    const { create = false, required = true } = options
    return {
      get() {
        const v = (() => {
          const v = process.env[name]
          if (typeof v === `undefined`) {
            if (typeof _default === `undefined`)
              throw new Error(`${name} must be defined`)
            return _default
          }
          return v
        })()
        if (create) {
          mkdirSync(v, { recursive: true })
        }
        if (required && !existsSync(v)) {
          throw new Error(`${name} (${v}) must exist.`)
        }
        return v
      },
      set(v) {
        if (!existsSync(v)) {
          throw new Error(`${name} (${v}) must exist.`)
        }
        process.env[name] = v
      },
    }
  }

export const mkString: Maker<string> = (_default) => (name: string) => {
  return {
    get() {
      const v = process.env[name]
      if (typeof v === `undefined`) {
        if (typeof _default === `undefined`)
          throw new Error(`${name} must be defined`)
        return _default
      }
      return v
    },
    set(v) {
      process.env[name] = v
    },
  }
}

export const mkCsvString: Maker<string[]> = (_default) => (name: string) => {
  return {
    get() {
      return (() => {
        const v = process.env[name]
        if (typeof v === `undefined`) {
          if (typeof _default === `undefined`)
            throw new Error(`${name} must be defined`)
          return _default
        }
        return v
          .split(/,/)
          .map((s) => s.trim())
          .filter((v) => !!v)
      })()
    },
    set(v) {
      process.env[name] = v.join(',')
    },
  }
}

type Config<T> = {
  [K in keyof T]: HandlerFactory<T[K]>
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
    }

    return lookup as T
  })

  return singleton(config)
}
