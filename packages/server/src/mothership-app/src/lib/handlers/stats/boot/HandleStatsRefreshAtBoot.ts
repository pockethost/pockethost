import { refreshPublicStats } from '../lib/refreshPublicStats'

export const HandleStatsRefreshAtBoot = (_e: core.BootstrapEvent) => {
  refreshPublicStats()
}
