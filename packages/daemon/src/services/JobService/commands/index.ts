import { CommandModuleInitializer, JobServiceApi } from '..'
import { CMD_BACKUP_INSTANCE } from './backup-instance'

const init: CommandModuleInitializer = (
  register: JobServiceApi['registerCommand'],
  client,
  knex
) => {
  register(CMD_BACKUP_INSTANCE, createBackupHandler(client, knex))
}
