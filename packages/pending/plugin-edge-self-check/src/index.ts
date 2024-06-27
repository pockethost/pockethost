import { join } from 'path'
import {
  LoggerService,
  PH_HOME,
  PocketHostFilter,
  PocketHostPlugin,
  Settings,
  mkPath,
} from 'pockethost/core'
import { HealthCommand } from './HealthCommand'

const _HOME_DIR =
  process.env.PH_FIREWALL_HOME || join(PH_HOME(), `plugin-edge-health-check`)

const settings = Settings({
  PH_EDGE_SELF_CHECK_HOME: mkPath(_HOME_DIR, { create: true }),
  PH_EDGE_SELF_CHECK_EXTRA_CHECKS: mkPath(join(_HOME_DIR, 'extra-checks.ts')),
})

export const HOME = () => settings.PH_EDGE_SELF_CHECK_HOME
export const EXTRA_CHECKS = () => settings.PH_EDGE_SELF_CHECK_EXTRA_CHECKS

const logger = LoggerService().create('HealthPlugin')
export const { dbg, info } = logger

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  registerFilter(PocketHostFilter.Core_CliCommands, async (commands) => {
    return [...commands, HealthCommand()]
  })
}

export default plugin
