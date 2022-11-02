import prompts from 'prompts'
import { SessionState } from '../providers/CustomAuthStore'
import { die } from './die'
import { isAdmin, pbClient } from './pbClient'
import { mkProjectSaver } from './project'

function isEmail(email: string) {
  var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
  if (email !== '' && email.match(emailFormat)) {
    return true
  }

  return false
}

export type ConnectionConfig = {
  session: SessionState
  host: string
}

export const ensureAdminClient = async (
  slug: string,
  config: ConnectionConfig
) => {
  const saver = mkProjectSaver<ConnectionConfig>(slug)
  const client = pbClient(config, (session) =>
    saver((config) => ({ ...config, session }))
  )
  const _isAdmin = await isAdmin(client)
  if (_isAdmin) {
    return client
  }

  const { host } = config

  console.log(
    `You must be logged in to ${host}/_ as a PocketBase admin to continue.`
  )

  while (true) {
    const response = await prompts(
      [
        {
          type: 'text',
          name: 'username',
          message: 'Username (email):',
          validate: (value: string) =>
            isEmail(value) ? true : `Enter an email address`,
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          validate: (value: string) =>
            value.length > 0 ? true : `Enter a password`,
        },
      ],
      { onCancel: () => die(`Exited.`) }
    )
    const { username, password } = response
    try {
      await client.admins.authViaEmail(username, password)
      saver((config) => ({ ...config, host }))
      console.log(`Successfully logged in as ${username} for project `)
      break
    } catch (e) {
      console.error(`Login failed for ${username}. Try again.`)
    }
  }
  return client
}
