import { ProcessId } from '@pockethost/common/src/schema'

export function pidIsRunning(pid: ProcessId) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return false
  }
}
