import { DiffResult } from './types'

export interface ISyncProvider {
  createFolder(folderPath: string): Promise<void>
  removeFile(filePath: string): Promise<void>
  removeFolder(folderPath: string): Promise<void>
  uploadFile(filePath: string, type: 'upload' | 'replace'): Promise<void>
  syncLocalToServer(diffs: DiffResult): Promise<void>
}
