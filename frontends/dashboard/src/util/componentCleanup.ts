import { createCleanupManager } from '$shared'
import { onDestroy } from 'svelte'

// TODO: Document this
export const mkCleanup = () => {
  const cm = createCleanupManager()

  onDestroy(() => cm.shutdown().catch(console.error))

  return (cb: () => any) => {
    cm.add(cb)
  }
}
