import bcrypt from 'bcryptjs'
import { JSONFileSyncPreset } from 'lowdb/node'
import { mkSingleton } from 'pockethost'
import { UserId } from 'pockethost/src/common/schema/BaseFields'
import { PLUGIN_DATA } from './constants'
import { info } from './log'

export type UserFields = {
  id: UserId
  username: string
  passwordHash: string
  isAdmin: boolean
}

export const DbService = mkSingleton(async () => {
  const db = JSONFileSyncPreset<{
    defaultUid: UserId
    users: { [_: UserId]: UserFields }
  }>(PLUGIN_DATA('users.json'), { users: {}, defaultUid: '' })

  const getUserByExactCriteria = (criteria: Partial<UserFields>) => {
    return Object.values(db.data.users).find((user) =>
      Object.entries(criteria).every(
        ([k, v]) => user[k as keyof UserFields] === v,
      ),
    )
  }

  const deleteUserByExactCriteria = (criteria: Partial<UserFields>) => {
    const user = getUserByExactCriteria(criteria)
    if (user) {
      db.update((data) => {
        delete data.users[user.id]
      })
      info(`Deleted user ${user.username}`)
    }
  }

  const addUser = (username: string, password: string, isAdmin = false) => {
    if (getUserByExactCriteria({ username })) {
      throw new Error(`User ${username} already exists`)
    }
    const id = username
    const passwordHash = bcrypt.hashSync(password, 10)
    db.update((data) => {
      data.users = {
        ...data.users,
        [id]: { id, username, passwordHash, isAdmin },
      }
    })
    info(`Added user ${username}/${password}`)
    return getFirstUserByExactCriteria({ id })!
  }

  const getAllUsersByExactCriteria = (criteria: Partial<UserFields>) => {
    return Object.values(db.data.users).filter((user) =>
      Object.entries(criteria).every(
        ([k, v]) => user[k as keyof UserFields] === v,
      ),
    )
  }

  const getFirstUserByExactCriteria = (criteria: Partial<UserFields>) => {
    return getAllUsersByExactCriteria(criteria)[0]
  }

  const authenticate = (
    username: string,
    password: string,
  ): UserFields | undefined => {
    const user = getFirstUserByExactCriteria({ username })
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      return user
    }
  }

  const getDefaultUser = (): UserFields | undefined => {
    return getFirstUserByExactCriteria({ id: db.data.defaultUid })
  }

  const setDefaultUser = (user: UserFields) => {
    db.update((data) => {
      data.defaultUid = user.id
    })
    info(`Set default user to ${user.username}`)
  }

  return {
    addUser,
    getUserByExactCriteria,
    deleteUserByExactCriteria,
    getAllUsersByExactCriteria,
    getFirstUserByExactCriteria,
    authenticate,
    getDefaultUser,
    setDefaultUser,
  }
})
