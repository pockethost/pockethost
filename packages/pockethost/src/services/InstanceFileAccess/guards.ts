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

export const INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES = Object.keys(FolderNamesMap)
export const INSTANCE_ROOT_PHYSICAL_FOLDER_NAMES = Object.values(FolderNamesMap)

/** Top-level dirs under /{subdomain}/ — matches ensureInstanceDirectoryStructure + .cache */
export const INSTANCE_ROOT_DIR_NAMES = [...INSTANCE_ROOT_PHYSICAL_FOLDER_NAMES, `logs`] as const

/** Deploy tools (phio, FTP-Deploy-Action) write sync state at instance root */
export const INSTANCE_ROOT_ALLOWED_FILE_NAMES = [`.ftp-deploy-sync-state.json`] as const

export function isInstanceRootVirtualFolder(name: string): name is VirtualFolderNames {
  return INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES.includes(name as VirtualFolderNames)
}

export function isAllowedInstanceRootDir(name: string) {
  return (INSTANCE_ROOT_DIR_NAMES as readonly string[]).includes(name)
}

export function isAllowedInstanceRootFile(name: string) {
  return (INSTANCE_ROOT_ALLOWED_FILE_NAMES as readonly string[]).includes(name)
}

export function isAtInstanceRoot(restOfVirtualPath: string[], instance?: { id: string }) {
  return !!instance && restOfVirtualPath.length === 0
}

/** Block creating or mutating paths directly under /{subdomain}/ */
export function assertNotInstanceRootMutation(restOfVirtualPath: string[], instance?: { id: string }) {
  if (!instance || restOfVirtualPath.length === 0) {
    return
  }
  if (
    restOfVirtualPath.length === 1 &&
    !isAllowedInstanceRootDir(restOfVirtualPath[0]!) &&
    !isAllowedInstanceRootFile(restOfVirtualPath[0]!)
  ) {
    throw new Error(`Accessing ${restOfVirtualPath[0]} is not allowed.`)
  }
}

export function assertNotInstanceRootMkdir(restOfVirtualPath: string[], instance?: { id: string }) {
  if (instance && restOfVirtualPath.length === 1) {
    throw new Error(`Cannot create directories at the instance root.`)
  }
}

export function assertNotInstanceRootDelete(restOfVirtualPath: string[], instance?: { id: string }) {
  if (instance && restOfVirtualPath.length === 1 && !isAllowedInstanceRootFile(restOfVirtualPath[0]!)) {
    throw new Error(`Cannot remove ${restOfVirtualPath[0]} from the instance root.`)
  }
}
