import { createCleanupManager } from 'pockethost'
import { onDestroy } from 'svelte'

// TODO: Document this more
// This is used to queue up functions and then destroy them once completed
// Currently being used on the Logging.svelte file to better handle the Real time subscription from Pocketbase.
export const mkCleanup = () => {
  const cm = createCleanupManager()

  onDestroy(() => cm.shutdown().catch(console.error))

  return (cb: () => any) => {
    cm.add(cb)
  }
}
