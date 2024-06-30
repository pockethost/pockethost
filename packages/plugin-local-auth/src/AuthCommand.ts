import { forEach } from '@s-libs/micro-dash'
import { Command } from 'commander'
import { gracefulExit } from 'pockethost/core'
import { DbService } from './db'
import { error, info } from './log'

export const AuthCommand = async () => {
  const {
    addUser,
    getFirstUserByExactCriteria,
    getAllUsersByExactCriteria,
    authenticate,
    deleteUserByExactCriteria,
  } = await DbService()

  const cmd = new Command(`auth`)
    .description(`Command root`)
    .addCommand(
      new Command(`add`)
        .argument(`<username>`, `User name`)
        .argument(`<password>`, `User password`)
        .alias(`a`)
        .option(`-a, --admin`, `Make the user an admin`)
        .description(`Add a user`)
        .action(async (username, password, options) => {
          if (getFirstUserByExactCriteria({ username })) {
            error(`User ${username} already exists`)
            await gracefulExit()
          }
          await addUser(username, password, options.admin)
        }),
    )
    .addCommand(
      new Command(`update`)
        .argument(`<username>`, `User name`)
        .argument(`<password>`, `User password`)
        .option(`-a, --admin`, `Make the user an admin`)
        .alias(`u`)
        .alias(`up`)
        .description(`Update a user`)
        .action(async (username: string, password: string, options) => {
          await deleteUserByExactCriteria({ username })
          await addUser(username, password, options.admin)
        }),
    )
    .addCommand(
      new Command(`delete`)
        .argument(`<username>`, `User ID`)
        .alias(`d`)
        .alias(`del`)
        .alias(`rm`)
        .description(`Delete a user`)
        .action(async (username: string, options) => {
          await deleteUserByExactCriteria({ username })
        }),
    )
    .addCommand(
      new Command(`list`)
        .alias(`ls`)
        .description(`List users`)
        .action(async (options) => {
          info(`Listing users`)
          const users = getAllUsersByExactCriteria({})
          forEach(users, (user) => {
            info(`${user.username}`, user.isAdmin ? `(admin)` : ``)
          })
        }),
    )
    .addCommand(
      new Command(`login`)
        .argument(`<username>`, `User name`)
        .argument(`<password>`, `User password`)
        .alias(`a`)
        .description(`Test the user login`)
        .action(async (username, password, options) => {
          const isAuthenticated = authenticate(username, password)
          if (isAuthenticated) {
            info(`User ${username} authenticated`)
          } else {
            error(`User ${username} not authenticated`)
          }
        }),
    )
  return cmd
}
