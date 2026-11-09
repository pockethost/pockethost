/** A row from a campaign's `usersQuery`. Columns the query didn't select are undefined. */
export type BulkMailRow = { verified?: boolean | number | null; unsubscribe?: boolean | number | null }

/**
 * Pre-filter for bulk mail. Only a column the audience query actually returned can rule a user out: the
 * `subscribed_users` / `verified_users` views already filter on verified/unsubscribe but don't return `verified`, and
 * treating that missing column as "unverified" skipped every recipient. `/api/mail` re-checks both on the real user
 * record before sending, so this never lets a suppressed user through.
 */
export const canReceiveBulkMail = (row: BulkMailRow): boolean => {
  if (row.verified !== undefined && row.verified !== null && !row.verified) return false
  if (row.unsubscribe) return false
  return true
}
