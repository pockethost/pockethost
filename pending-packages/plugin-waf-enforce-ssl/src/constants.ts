import { join } from 'path'
import { PH_HOME, Settings, mkPath } from 'pockethost/core'

const HOME_DIR =
  process.env.PH_WAF_ENFORCE_SSL_HOME ||
  join(PH_HOME(), `plugin-waf-enforce-ssl`)

const TLS_PFX = `tls`

const settings = Settings({
  PH_WAF_ENFORCE_SSL_HOME: mkPath(HOME_DIR, { create: true }),
  PH_WAF_ENFORCE_SSL_KEY: mkPath(join(HOME_DIR, `${TLS_PFX}.key`)),
  PH_WAF_ENFORCE_SSL_CERT: mkPath(join(HOME_DIR, `${TLS_PFX}.cert`)),
})

export const SSL_KEY = () => settings.PH_WAF_ENFORCE_SSL_KEY
export const SSL_CERT = () => settings.PH_WAF_ENFORCE_SSL_CERT
