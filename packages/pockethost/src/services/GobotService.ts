import { default as env } from 'env-var'
import { GobotOptions, gobot } from 'gobot'
import { mkSingleton } from '../common'
import { PH_GOBOT_ROOT } from '../constants'

export const PH_GOBOT_VERBOSITY = () =>
  env.get(`PH_GOBOT_VERBOSITY`).default(1).asIntPositive()

export const GobotService = mkSingleton(() => {
  return {
    gobot: (name: string, options?: Partial<GobotOptions>) => {
      // verbosity(PH_GOBOT_VERBOSITY())
      return gobot(name, {
        ...options,
        cachePath: PH_GOBOT_ROOT(`cache`, name),
      })
    },
  }
})
