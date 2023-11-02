import { DEBUG } from '$constants'
import { gracefulExit } from './exit'
;['unhandledRejection', 'uncaughtException'].forEach((type) => {
  process.on(type, (e) => {
    console.error(`${e}`)

    if (DEBUG) {
      console.error(e.stack)
      gracefulExit()
    }
  })
})
