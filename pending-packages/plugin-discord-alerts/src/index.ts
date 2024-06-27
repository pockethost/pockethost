import { join } from 'path'
import {
  DEBUG,
  LoggerService,
  PH_HOME,
  PocketHostPlugin,
  Settings,
  gracefulExit,
  mkNumber,
  mkString,
  onInit,
} from 'pockethost/core'
import { alert, send } from './lib'

const _HOME_DIR =
  process.env.PH_FIREWALL_HOME || join(PH_HOME(), `plugin-discord-alerts`)

const settings = Settings({
  PH_DISCORD_ALERTS_ALERT_CHANNEL_URL: mkString(),
  PH_DISCORD_ALERTS_HEALTH_CHANNEL_URL: mkString(),
  PH_DISCORD_ALERTS_DUPLICATE_ALERT_MS: mkNumber(60 * 1000),
})

export const ALERT_CHANNEL_URL = () =>
  settings.PH_DISCORD_ALERTS_ALERT_CHANNEL_URL

export const HEALTH_CHANNEL_URL = () =>
  settings.PH_DISCORD_ALERTS_HEALTH_CHANNEL_URL

export const DUPLICATE_ALERT_MS = () =>
  settings.PH_DISCORD_ALERTS_DUPLICATE_ALERT_MS

export const logger = LoggerService().create('plugin-discord-alerts')
export const { dbg } = logger

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  onInit(async () => {
    ;['unhandledRejection', 'uncaughtException'].forEach((type) => {
      process.on(type, (e) => {
        console.error(e)
        try {
          alert(ALERT_CHANNEL_URL(), e)
        } catch (e) {
          console.error(e)
        }
        if (DEBUG()) {
          console.error(e.stack)
          gracefulExit()
        }
      })
    })
  })

  registerAction(
    PocketHostAction.Firewall_OnRequestError,
    async ({ error }) => {
      alert(ALERT_CHANNEL_URL(), error.message)
    },
  )

  registerAction(PocketHostAction.Health_OnError, async ({ error }) => {
    alert(ALERT_CHANNEL_URL(), error.message)
  })

  registerAction(PocketHostAction.Health_OnMessage, async ({ lines }) => {
    send(HEALTH_CHANNEL_URL(), lines)
  })
}

export default plugin
