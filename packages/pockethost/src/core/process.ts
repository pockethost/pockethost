import { discordAlert, gracefulExit } from '@'
import { DEBUG } from '.'
;['unhandledRejection', 'uncaughtException'].forEach((type) => {
  process.on(type, (e) => {
    console.error(`Unhandled:`, e)
    try {
      discordAlert(e)
    } catch (e) {
      console.error(`Failed to alert Discord:`, e)
    }
    const debug = (() => {
      try {
        return DEBUG()
      } catch {
        return true
      }
    })()
    if (debug) {
      console.error(`Unhandled debug trace:`, e.stack)
      gracefulExit()
    }
  })
})
