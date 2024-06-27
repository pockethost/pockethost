import { join } from 'path'
import {
  APEX_DOMAIN,
  HTTP_PROTOCOL,
  IS_DEV,
  PocketHostFilter,
  PocketHostPlugin,
  Settings,
  mkString,
} from 'pockethost/core'

export const _APP_NAME = process.env.PH_APP_NAME || 'app'

const settings = Settings({
  PH_APP_NAME: mkString(_APP_NAME),
  PH_APP_URL: mkString(`${HTTP_PROTOCOL()}//${_APP_NAME}.${APEX_DOMAIN()}`),
  PH_BLOG_URL: mkString(`${HTTP_PROTOCOL}//${APEX_DOMAIN()}`),
})

export const APP_URL = () => settings.PH_APP_URL
export const APP_NAME = () => settings.PH_APP_NAME
export const BLOG_URL = (...path: string[]) =>
  join(settings.PH_BLOG_URL, ...path)
export const DOCS_URL = (...path: string[]) => BLOG_URL(`docs`, ...path)

export const mkAppUrl = (path = '') => `${APP_URL()}${path}`
export const mkBlogUrl = (path = '') => `${BLOG_URL()}${path}`
export const mkDocUrl = (path = '') => mkBlogUrl(join('/docs', path))

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  registerFilter(
    PocketHostFilter.Mothership_MaintenanceMode_Message,
    async (message: string) => {
      return `${message} See ${mkDocUrl(
        `usage/maintenance`,
      )} for more information.`
    },
  )

  registerFilter(
    PocketHostFilter.Mothership_UnverifiedAccountError_Message,
    async (message: string) => {
      return `${message} Log in at ${mkAppUrl()} to verify your account.`
    },
  )

  registerFilter(
    PocketHostFilter.Core_ErrorSpawningInstanceMessage,
    async (message: string, { instance }) => {
      return `${message} Please review your instance logs at ${mkAppUrl(
        `/app/instances/${instance.id}`,
      )} or contact support at ${mkBlogUrl(`support`)}.`
    },
  )

  registerFilter(
    PocketHostFilter.Core_FailedToLaunchInstanceMessage,
    async (message, { instance }) => {
      const { id, subdomain } = instance
      return `${message} Please check logs at ${APP_URL()}. [${id}:${subdomain}]. ${DOCS_URL(
        `usage`,
        `errors`,
      )}`
    },
  )

  registerFilter(PocketHostFilter.Firewall_HostnameRoutes, async (routes) => {
    if (!IS_DEV()) return routes
    return {
      ...routes,
      [`${APP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${5174}`,
      [`superadmin.${APEX_DOMAIN()}`]: `http://localhost:${5175}`,
      [`${APEX_DOMAIN()}`]: `http://localhost:${8080}`,
    }
  })
}

export default plugin
