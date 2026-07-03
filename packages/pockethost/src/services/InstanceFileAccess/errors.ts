import type { InstanceFields } from '@'

export const INSTANCE_CONTEXT_REQUIRED = 'Change into an instance directory first (e.g. /your-subdomain/pb_public).'

export class InstanceVfsUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InstanceVfsUserError'
  }
}

export function assertInstanceContext(instance: InstanceFields | undefined): asserts instance is InstanceFields {
  if (!instance) {
    throw new InstanceVfsUserError(INSTANCE_CONTEXT_REQUIRED)
  }
}

const VFS_NOT_FOUND_CODES = new Set(['ENOENT', 'ENOTDIR'])

export function isVfsNotFoundError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code
  if (code && VFS_NOT_FOUND_CODES.has(code)) {
    return true
  }

  const message = err instanceof Error ? err.message : `${err}`
  return message.includes('not found') || message.includes('no such file')
}

/** Expected client mistakes — not server faults. */
export function isExpectedVfsClientError(err: unknown): boolean {
  if (err instanceof InstanceVfsUserError) {
    return true
  }

  if (isVfsNotFoundError(err)) {
    return true
  }

  const message = err instanceof Error ? err.message : `${err}`
  return (
    message.includes('powered off') ||
    message.includes('not allowed') ||
    message.includes('Cannot ') ||
    message.includes('Not a valid directory') ||
    message.includes('Cannot read a directory') ||
    message.includes(INSTANCE_CONTEXT_REQUIRED)
  )
}
