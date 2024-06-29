import devcert from 'devcert'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import inquirer from 'inquirer'
import {
  PocketHostPlugin,
  onCliCommandsFilter,
  onServeAction,
  onServeSlugsFilter,
} from 'pockethost'
import { APEX_DOMAIN, gracefulExit } from 'pockethost/core'
import { FtpCommand } from './FtpCommand'
import { ftp } from './FtpCommand/ServeCommand/ftp'
import { HOME_DIR, PLUGIN_NAME, SSL_CERT, SSL_KEY } from './constants'
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

  if (!existsSync(SSL_KEY())) {
    if (!existsSync(SSL_CERT())) {
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
    }
  }
}
