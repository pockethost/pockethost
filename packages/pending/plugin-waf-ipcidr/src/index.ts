import {
  Express,
  PocketHostAction,
  PocketHostPlugin,
  compact,
} from 'pockethost/core'
import { createIpWhitelistMiddleware } from './cidr'
import { ALLOWED_CIDRS, PRESET } from './constants'
import { PRESETS } from './presets'

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  registerAction(PocketHostAction.Waf_OnAppMiddleware, async (app: Express) => {
    app.use(
      createIpWhitelistMiddleware(
        compact([
          ...(PRESETS[PRESET() as keyof typeof PRESETS] || []),
          ...ALLOWED_CIDRS(),
        ]),
      ),
    )
  })
}

export default plugin
