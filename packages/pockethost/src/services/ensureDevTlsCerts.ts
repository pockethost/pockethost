import { APEX_DOMAIN, IS_DEV, Logger, MOTHERSHIP_NAME, PH_HOME } from '@'
import devcert, { removeDomain, uninstall } from 'devcert'
import { X509Certificate } from 'crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const TLS_PFX = `tls`

const devCertDomains = () => {
  const domain = APEX_DOMAIN()
  return [domain, `app.${domain}`, `${MOTHERSHIP_NAME()}.${domain}`, `mail.${domain}`]
}

const devcertRootCaCertPath = () => {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library/Application Support/devcert/certificate-authority/certificate.cert')
  }
  if (process.platform === 'linux') {
    return join(homedir(), '.config/devcert/certificate-authority/certificate.cert')
  }
  return join(process.env.LOCALAPPDATA ?? homedir(), 'devcert/certificate-authority/certificate.cert')
}

const isCertExpired = (certPath: string) => {
  try {
    const cert = new X509Certificate(readFileSync(certPath, 'utf8'))
    return new Date(cert.validTo) <= new Date()
  } catch {
    return true
  }
}

const isDevcertCaExpired = () => {
  const caPath = devcertRootCaCertPath()
  if (!existsSync(caPath)) return false
  return isCertExpired(caPath)
}

const clearLocalTls = (keyPath: string, certPath: string, certDomains: string[]) => {
  removeDomain(certDomains)
  for (const path of [keyPath, certPath]) {
    if (existsSync(path)) unlinkSync(path)
  }
}

export const ensureDevTlsCerts = async (logger: Logger) => {
  if (!IS_DEV()) return

  const sslHome = join(PH_HOME(), `ssl`)
  const keyPath = join(sslHome, `${TLS_PFX}.key`)
  const certPath = join(sslHome, `${TLS_PFX}.cert`)
  const certDomains = devCertDomains()
  const caExpired = isDevcertCaExpired()
  const leafExpired = !existsSync(certPath) || isCertExpired(certPath)

  if (existsSync(keyPath) && existsSync(certPath) && !leafExpired && !caExpired) {
    logger.dbg(`Dev TLS cert present at ${sslHome}`)
    return
  }

  if (caExpired) {
    logger.info(`devcert root CA expired — reinstalling CA (sudo may prompt)`)
    uninstall()
    clearLocalTls(keyPath, certPath, certDomains)
  } else if (leafExpired) {
    logger.info(`Dev TLS cert expired — regenerating`)
    clearLocalTls(keyPath, certPath, certDomains)
  }

  logger.info(`Generating dev TLS cert for ${certDomains.join(', ')} (devcert — may prompt for sudo once)`)

  mkdirSync(sslHome, { recursive: true })
  const { key, cert } = await devcert.certificateFor(certDomains, { skipHostsFile: true })

  writeFileSync(keyPath, key)
  writeFileSync(certPath, cert)
  logger.info(`Wrote dev TLS cert to ${sslHome}`)
}
