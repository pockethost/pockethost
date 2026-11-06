type Suspendable = { suspension?: string | null } | null | undefined

/**
 * Reason file access (SFTP/FTP) must be refused, or null when allowed. Account suspension wins over instance
 * suspension, matching the edge request path.
 */
export function fileAccessSuspension(owner: Suspendable, instance?: Suspendable): string | null {
  const ownerReason = owner?.suspension?.trim()
  if (ownerReason) return ownerReason
  const instanceReason = instance?.suspension?.trim()
  if (instanceReason) return instanceReason
  return null
}
