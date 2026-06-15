export const currentSyncFileVersion = '1.0.0'
export const syncFileDescription =
  'DO NOT DELETE THIS FILE. This file is used to keep track of which files have been synced in the most recent deployment. If you delete this file a resync will need to be done (which can take a while) - read more: https://github.com/SamKirkland/FTP-Deploy-Action'

export interface IFtpDeployArguments {
  server: string
  username: string
  password?: string
  port?: number
  protocol?: 'sftp'
  'private-key-path'?: string
  'local-dir'?: string
  'server-dir'?: string
  'state-name'?: string
  'dry-run'?: boolean
  'dangerous-clean-slate'?: boolean
  include?: string[]
  exclude?: string[]
  'log-level'?: 'minimal' | 'standard' | 'verbose'
  timeout?: number
}

export interface IFtpDeployArgumentsWithDefaults {
  server: string
  username: string
  password: string
  port: number
  protocol: 'sftp'
  'private-key-path': string | undefined
  'local-dir': string
  'server-dir': string
  'state-name': string
  'dry-run': boolean
  'dangerous-clean-slate': boolean
  include: string[]
  exclude: string[]
  'log-level': 'minimal' | 'standard' | 'verbose'
  timeout: number
}

export interface IFile {
  type: 'file'
  name: string
  size: number
  hash: string
}

export interface IFolder {
  type: 'folder'
  name: string
  size: undefined
}

export type Record = IFolder | IFile

export interface IFileList {
  description: string
  version: '1.0.0'
  generatedTime: number
  data: Record[]
}

export type DiffResult = {
  upload: Record[]
  delete: Record[]
  replace: Record[]
  same: Record[]
  sizeUpload: number
  sizeDelete: number
  sizeReplace: number
}

export interface IDiff {
  getDiffs(localFiles: IFileList, serverFiles: IFileList): DiffResult
}

export interface IFilePath {
  folders: string[] | null
  file: string | null
}
