import bcrypt from 'bcryptjs'
import devcert from 'devcert'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import inquirer from 'inquirer'
import {
  PocketHostPlugin,
  onAfterPluginsLoadedAction,
  onCliCommandsFilter,
  onServeAction,
  onServeSlugsFilter,
  onSettingsFilter,
} from 'pockethost'
import { APEX_DOMAIN, gracefulExit, setConfig } from 'pockethost/core'
import { FtpCommand } from './FtpCommand'
import { ftp } from './FtpService/ftp'
import {
  FALLBACK_PASSWORD,
  FALLBACK_USERNAME,
  HOME_DIR,
  PLUGIN_NAME,
  SSL_CERT,
  SSL_KEY,
  settings,
} from './constants'
import { error, info } from './log'

export const plugin: PocketHostPlugin = async ({}) => {
  onCliCommandsFilter(async (commands) => {
    return [...commands, FtpCommand()]
  })

  onServeSlugsFilter(async (slugs) => {
    return [...slugs, PLUGIN_NAME]
  })

  onServeAction(async ({ only }) => {
    if (!only.includes(PLUGIN_NAME)) return
    ftp()
  })

  /** Check for SSL keys */
  onAfterPluginsLoadedAction(async () => {
    if (existsSync(SSL_KEY()) && existsSync(SSL_CERT())) return
    const answers = await inquirer.prompt<{ ssl: boolean }>([
      {
        type: 'confirm',
        name: 'ssl',
        message: `FTP Server requires SSL keys, but none were found in ${SSL_CERT()} and ${SSL_KEY()}. Do you want to generate locally trusted SSL keys?`,
      },
    ])
    if (answers.ssl) {
      info(`Generating SSL keys...`)
      mkdirSync(HOME_DIR, { recursive: true })
      const { key, cert } = await devcert.certificateFor(APEX_DOMAIN(), {})
      writeFileSync(SSL_KEY(), key)
      writeFileSync(SSL_CERT(), cert)
      info(`SSL keys generated.`)
    } else {
      error(`SSL keys are required for FTP server.`)
      await gracefulExit()
    }
  })

  /** Check for admin login/pw */
  onAfterPluginsLoadedAction(async () => {
    if (FALLBACK_USERNAME() && FALLBACK_PASSWORD()) return

    info(`FTP needs a default admin user. Choose something secure.`)
    const answers = await inquirer.prompt<{
      username: string
      password: string
    }>([
      {
        type: 'input',
        name: 'username',
        message: 'Username',
        validate: (input) => {
          if (!input) return 'Username cannot be empty'
          return true
        },
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password',
        validate: (input) => {
          if (!input) return 'Password cannot be empty'
          return true
        },
      },
    ])
    const { username, password } = answers
    setFallbackAdmin(username, password)
  })

  onSettingsFilter(async (allSettings) => ({ ...allSettings, ...settings }))
}

export const setFallbackAdmin = (username: string, password: string) => {
  setConfig('PH_FTP_FALLBACK_USERNAME', username)
  const passwordHash = bcrypt.hashSync(password, 10)
  setConfig(`PH_FTP_FALLBACK_PASSWORD`, passwordHash)
  info(`"${username}" created as admin.`)
}
