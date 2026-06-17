export type PhErrorKind = 'user' | 'system'

export type PhError = Error & { phErrorKind?: PhErrorKind }

export const userError = (message: string | Error): PhError => {
  const err = (message instanceof Error ? message : new Error(message)) as PhError
  err.phErrorKind = 'user'
  return err
}

export const systemError = (message: string | Error): PhError => {
  const err = (message instanceof Error ? message : new Error(message)) as PhError
  err.phErrorKind = 'system'
  return err
}

export const isUserError = (err: unknown): err is PhError =>
  err instanceof Error && (err as PhError).phErrorKind === 'user'

export const isSystemError = (err: unknown): err is PhError =>
  err instanceof Error && (err as PhError).phErrorKind === 'system'

const DOCKER_RUN_EXIT_CODES = new Set([125, 126, 127])

/** Client-side SFTP/SSH failures (bad client, wrong port/protocol, failed handshake). */
const SFTP_CLIENT_ERROR =
  /Handshake failed|no matching (host key|key exchange|cipher|MAC|compression|authentication method)|Authentication failed|All configured authentication methods failed|Unsupported protocol|Received HTTP request/i

export const isSftpClientError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : `${err}`
  return SFTP_CLIENT_ERROR.test(msg)
}

export const classifySftpError = (err: unknown): PhError => {
  if (err instanceof Error && (err as PhError).phErrorKind) return err as PhError
  if (isSftpClientError(err)) return userError(err instanceof Error ? err : new Error(`${err}`))
  return systemError(err instanceof Error ? err : new Error(`${err}`))
}

/** Container already removed (AutoRemove, prior stop, or race). */
export const isDockerContainerNotFound = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : `${err}`
  return /\(HTTP code 404\).*no such container|no such container:/i.test(msg)
}

/** Transient Docker name/removal race (AutoRemove overlap, stop vs spawn). */
export const isDockerContainerConflict = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : `${err}`
  return (
    /\(HTTP code 409\)/i.test(msg) &&
    /removal of container.*is already in progress|container name.*is already in use|name is already in use/i.test(msg)
  )
}

/** Docker daemon / host resource failures. App exit codes (e.g. JSVM) are user-side. */
export const isPlatformDockerFailure = (statusCode: number, err?: unknown): boolean => {
  if (DOCKER_RUN_EXIT_CODES.has(statusCode)) return true
  const msg = `${err ?? ''}`
  return /connect to the Docker daemon|ECONNREFUSED.*docker|no space left on device|too many open files|EMFILE|ENFILE|Could not get port binding|invalid port binding/i.test(
    msg
  )
}
