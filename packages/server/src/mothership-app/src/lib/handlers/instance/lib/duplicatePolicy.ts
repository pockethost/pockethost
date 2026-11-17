/** The source instance's fields that decide whether it can be duplicated. */
export type DuplicateSource = {
  power: boolean
  status: string
  suspension: string
  duplicateStatus: string
  edge: string
}

/** Why `source` can't be duplicated now, or null when it can. */
export const duplicateSourceError = (source: DuplicateSource): string | null => {
  if (source.suspension) return `This instance is suspended, so it can't be duplicated.`
  if (source.power || source.status.toLowerCase() !== 'idle') {
    return `Power this instance off first, so the copy is consistent.`
  }
  if (source.duplicateStatus === 'copying') return `This instance is still being copied. Try again when it's ready.`
  if (source.duplicateStatus === 'failed') return `This instance's own copy failed, so it can't be duplicated.`
  if (!source.edge) return `This instance isn't placed on a server yet. Try again in a minute.`
  return null
}

/** Why an instance with this `duplicateStatus` can't be powered on, or null when it can. */
export const duplicatePowerOnError = (duplicateStatus: string, duplicateError: string): string | null => {
  if (duplicateStatus === 'copying') return `This copy is still being made. It can be powered on once it's ready.`
  if (duplicateStatus === 'failed') {
    return `This copy failed${duplicateError ? `: ${duplicateError}` : ''}. Delete it and duplicate again.`
  }
  return null
}
