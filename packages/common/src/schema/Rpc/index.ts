export enum RpcCommands {
  CreateInstance = 'create-instance',
  BackupInstance = 'backup-instance',
  RestoreInstance = 'restore-instance',
}

export const RPC_COMMANDS = [
  RpcCommands.BackupInstance,
  RpcCommands.CreateInstance,
]

export * from './BackupInstance'
export * from './CreateInstance'
export * from './RestoreInstance'
