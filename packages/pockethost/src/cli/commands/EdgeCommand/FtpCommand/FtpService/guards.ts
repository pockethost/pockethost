import { keys, values } from '@s-libs/micro-dash'

export enum VirtualFolderNames {
  Cache = `.cache`,
  Data = 'pb_data',
  Public = 'pb_public',
  Migrations = 'pb_migrations',
  Hooks = 'pb_hooks',
}

export enum PhysicalFolderNames {
  Cache = `.cache`,
  Data = 'pb_data',
  Public = 'pb_public',
  Migrations = 'pb_migrations',
  Hooks = 'pb_hooks',
}
export const POWERED_OFF_ONLY: string[] = [VirtualFolderNames.Data]

export const FolderNamesMap: {
  [_ in VirtualFolderNames]: PhysicalFolderNames
} = {
  [VirtualFolderNames.Cache]: PhysicalFolderNames.Cache,
  [VirtualFolderNames.Data]: PhysicalFolderNames.Data,
  [VirtualFolderNames.Public]: PhysicalFolderNames.Public,
  [VirtualFolderNames.Migrations]: PhysicalFolderNames.Migrations,
  [VirtualFolderNames.Hooks]: PhysicalFolderNames.Hooks,
} as const

export const INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES = keys(FolderNamesMap)
export const INSTANCE_ROOT_PHYSICAL_FOLDER_NAMES = values(FolderNamesMap)

export function isInstanceRootVirtualFolder(
  name: string,
): name is VirtualFolderNames {
  return INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES.includes(name as VirtualFolderNames)
}

export function virtualFolderGuard(
  name: string,
): asserts name is VirtualFolderNames {
  if (!isInstanceRootVirtualFolder(name)) {
    // throw new Error(`Accessing ${name} is not allowed.`)
  }
}
