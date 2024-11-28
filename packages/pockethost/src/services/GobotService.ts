import { mkSingleton } from '@'
import { GobotOptions, gobot } from 'gobot'
import { PH_GOBOT_ROOT } from '../constants'

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
