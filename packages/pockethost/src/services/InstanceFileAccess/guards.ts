export enum VirtualFolderNames {
  Cache = `.cache`,
  Data = 'pb_data',
  Public = 'pb_public',
  Migrations = 'pb_migrations',
  Hooks = 'pb_hooks',
}

export const POWERED_OFF_ONLY: string[] = [VirtualFolderNames.Data]

export function isAtInstanceRoot(restOfVirtualPath: string[], instance?: { id: string }) {
  return !!instance && restOfVirtualPath.length === 0
}
