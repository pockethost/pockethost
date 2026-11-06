/** Reserved secret: PocketHost starts PocketBase with `--encryptionEnv=PB_ENCRYPTION_KEY` when it's set. */
export const ENCRYPTION_KEY_SECRET = 'PB_ENCRYPTION_KEY'

const CONSEQUENCE =
  `PocketBase encrypts your app settings with this key. Once they're encrypted, they can only be read with the same key:\n\n` +
  `• PocketBase 0.23+ won't start without it.\n` +
  `• Older versions start with default settings (no SMTP, S3, OAuth). Saving settings then overwrites the encrypted ones.\n\n` +
  `Make sure you have a copy of the current key before you continue.`

export const confirmEncryptionKeyDelete = () =>
  confirm(
    `Delete ${ENCRYPTION_KEY_SECRET}?\n\n${CONSEQUENCE}\n\nThe change applies the next time your instance starts.`
  )

export const confirmEncryptionKeyChange = () =>
  confirm(
    `Replace ${ENCRYPTION_KEY_SECRET}?\n\n${CONSEQUENCE}\n\nSettings encrypted with the old key won't load with the new one. The change applies the next time your instance starts.`
  )
