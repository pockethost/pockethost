export type VacuumWaitOptions = {
  isLocked: () => boolean
  sleep: (ms: number) => Promise<void>
  retryMs: number
  graceMs: number
  isAborted?: () => boolean
}

export const waitUntilVacuumUnlocked = async ({
  isLocked,
  sleep,
  retryMs,
  graceMs,
  isAborted,
}: VacuumWaitOptions): Promise<boolean> => {
  if (!isLocked()) return true

  const deadline = Date.now() + graceMs

  while (Date.now() < deadline) {
    if (isAborted?.()) return false
    if (!isLocked()) return true

    const remaining = deadline - Date.now()
    if (remaining <= 0) break

    await sleep(Math.min(retryMs, remaining))
  }

  return !isLocked()
}
