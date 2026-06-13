import { canFetch, LoggerService, MOTHERSHIP_URL, neverendingPromise, syncCachedVersionsToMothership } from '@'
import { Command } from 'commander'
import { daemon } from '../EdgeCommand/DaemonCommand/ServeCommand/daemon'
import { ftp } from '../EdgeCommand/FtpCommand/ServeCommand/ftp'
import { firewall } from '../FirewallCommand/ServeCommand/firewall/server'
import { mothership } from '../MothershipCommand/ServeCommand/mothership'

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run the entire PocketHost stack`).action(async () => {
    const logger = LoggerService().create(`cli:serve`)
    const { dbg, info } = logger
    info(`Starting`)

    const healthUrl = MOTHERSHIP_URL(`/api/health`)
    if (await canFetch(healthUrl)) {
      info(`Mothership already reachable, skipping launch`)
    } else {
      await mothership({ logger })
    }
    dbg(`Mothership ready`)
    await syncCachedVersionsToMothership()
    dbg(`Pocketbase versions synced`)
    await daemon({ logger })
    dbg(`Daemon ready`)
    await firewall({ logger })
    dbg(`Firewall ready`)
    await ftp({ logger })
    dbg(`FTP ready`)
    await neverendingPromise(logger)
  })
  return cmd
}
