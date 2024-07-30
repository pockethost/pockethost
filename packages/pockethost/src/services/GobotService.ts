import { GobotOptions, gobot } from 'gobot'
import { mkSingleton } from '../common'
import { PH_GOBOT_ROOT } from '../constants'

export const GobotService = mkSingleton(() => {
  return {
    gobot: (name: string, options?: Partial<GobotOptions>) =>
      gobot(name, { ...options, cachePath: PH_GOBOT_ROOT(`cache`, name) }),
  }
})
