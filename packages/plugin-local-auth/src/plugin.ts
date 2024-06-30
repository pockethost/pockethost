import { produce } from 'immer'
import inquirer from 'inquirer'
import {
  PocketHostPlugin,
  onAfterPluginsLoadedAction,
  onAuthenticateUserFilter,
  onCliCommandsFilter,
  onInstanceConfigFilter,
  onNewInstanceRecordFilter,
  onSettingsFilter,
} from 'pockethost'
import { UserId } from 'pockethost/src/common/schema/BaseFields'
import { AuthCommand } from './AuthCommand'
import {
  PLUGIN_NAME,
  PLUGIN_NAME_CONSTANT_CASE,
  PROJECT_DIR,
  settings,
} from './constants'
import { DbService } from './db'
import { dbg, info } from './log'

export type WithUid = { uid: UserId }

export const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  const { getDefaultUser, addUser, setDefaultUser, authenticate } =
    await DbService({})

  onInstanceConfigFilter(async (config) => {
    return produce(config, (draft) => {
      draft.env[`PH_${PLUGIN_NAME_CONSTANT_CASE}_ENABLED`] = true.toString()
      draft.binds.hooks.push({
        src: PROJECT_DIR(`src/instance-app/hooks/**/*`),
        base: PROJECT_DIR(`src/instance-app/hooks`),
      })
    })
  })

  onCliCommandsFilter(async (commands) => {
    return [...commands, await AuthCommand()]
  })

  onSettingsFilter(async (allSettings) => ({ ...allSettings, ...settings }))

  onNewInstanceRecordFilter<Partial<WithUid>>(async (instance) => {
    const uid = instance.uid || getDefaultUser()?.id

    return { ...instance, uid }
  })

  onAuthenticateUserFilter(async (userId, context) => {
    const { username, password } = context
    return userId || authenticate(username, password)?.id
  })

  onAfterPluginsLoadedAction(async () => {
    if (getDefaultUser()) return
    info(`Local auth needs a default admin user.`)
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
    const user = addUser(username, password, true)
    setDefaultUser(user)
    info(`User ${user.username} created as admin.`)
  })
}
