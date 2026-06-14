import { vacuumAll } from './vacuum'

export const compact = async ({ dryRun = false } = {}) => {
  await vacuumAll({ dryRun })
}
