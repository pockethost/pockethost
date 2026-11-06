/**
 * Reserved secret name. When an instance has this secret, PocketBase is started with
 * `--encryptionEnv=PB_ENCRYPTION_KEY` so it encrypts (and can decrypt) its stored app settings. The value itself
 * reaches the container as an env var like any other secret.
 */
export const PB_ENCRYPTION_KEY_ENV = 'PB_ENCRYPTION_KEY'

export type ServeArgsInput = {
  dev?: boolean
  /** The env passed to the container (instance secrets included). */
  env?: { [_: string]: string | undefined }
}

/**
 * Builds the container command for `pocketbase serve`. This is the only place serve flags are added, and only from a
 * fixed list: users can never pass arbitrary flags (`--dir`, `--http`, `--hooksDir` would break instance isolation).
 */
export const buildServeArgs = ({ dev = false, env = {} }: ServeArgsInput): string[] => {
  const cmd = ['./pocketbase', 'serve', '--http', '0.0.0.0:8090']
  if (dev) {
    cmd.push('--dev')
  }
  const key = env[PB_ENCRYPTION_KEY_ENV]
  if (typeof key === 'string' && key.length > 0) {
    cmd.push(`--encryptionEnv=${PB_ENCRYPTION_KEY_ENV}`)
  }
  return cmd
}
