/** Reason a user must not receive platform email, or null if OK to send. */
export const mailRecipientSkipReason = (user: models.Record): string | null => {
  if (!user.getBool('verified')) return 'unverified'
  if (user.getBool('unsubscribe')) return 'unsubscribed'
  return null
}

/** Permanent bounce or complaint: stop all future platform email. */
export const suppressUserEmail = (user: models.Record) => {
  user.setVerified(false)
  user.set('unsubscribe', true)
}
