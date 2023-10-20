import { PUBLIC_DEBUG } from '$constants'
import { LoggerService } from '@pockethost/common'
import { gracefulExit } from './exit'
;['unhandledRejection', 'uncaughtException'].forEach((type) => {
  process.on(type, (e) => {
    const { error } = LoggerService().create(type)

    error(`${e}`)

    if (PUBLIC_DEBUG) {
      gracefulExit(42)
    }
  })
})
