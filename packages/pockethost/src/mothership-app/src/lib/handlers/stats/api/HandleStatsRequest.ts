import { mkPublicStatsPath, refreshPublicStats } from '../lib/refreshPublicStats'

/** Public aggregate platform stats (hourly cron + on-demand refresh). */
export const HandleStatsRequest = (c: echo.Context) => {
  const readStats = () => {
    const raw = $os.readFile(mkPublicStatsPath())
    return JSON.parse(typeof raw === 'string' ? raw : String(raw))
  }

  try {
    return c.json(200, readStats())
  } catch {
    return c.json(200, refreshPublicStats())
  }
}
