import publicRoutes from '$util/public-routes.json'
import UrlPattern from 'url-pattern'
import base from '../../../package.json'

export const POCKETHOST_VERSION = base.version

export const ROUTES = publicRoutes.map((pattern) => new UrlPattern(pattern))
