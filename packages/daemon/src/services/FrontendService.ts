import { mkSingleton } from '@pockethost/common'

export const frontendService = mkSingleton(async () => {
  return {
    shutdown() {},
  }
})
