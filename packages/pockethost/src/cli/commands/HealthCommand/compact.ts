import { vacuumAll } from './vacuum'

export const compact = async ({ dryRun = false, hoursBack }: { dryRun?: boolean; hoursBack?: number } = {}) => {
  await vacuumAll({ dryRun, hoursBack })
}
