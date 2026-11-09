/**
 * Free space a WAL-mode `VACUUM` needs: SQLite writes a full temporary copy of the database to its temp directory, then
 * rewrites the database through the WAL, so peak extra usage is about twice the file size.
 */
export const VACUUM_SPACE_FACTOR = 2

export type VacuumBudget = { ok: true } | { ok: false; neededBytes: number }

/** `freeBytes` undefined means the free space couldn't be measured; don't block the vacuum on that. */
export const checkVacuumBudget = (sizeBytes: number, freeBytes: number | undefined): VacuumBudget => {
  if (freeBytes === undefined) return { ok: true }
  const neededBytes = sizeBytes * VACUUM_SPACE_FACTOR
  return freeBytes >= neededBytes ? { ok: true } : { ok: false, neededBytes }
}
