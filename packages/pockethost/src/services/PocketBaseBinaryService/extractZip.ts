import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const extractPocketBaseZip = async (zipPath: string, destDir: string, binaryName: string) => {
  if (process.platform === 'darwin') {
    await execFileAsync('ditto', ['-xk', zipPath, destDir])
    return
  }

  await execFileAsync('unzip', ['-o', '-j', zipPath, binaryName, '-d', destDir])
}
