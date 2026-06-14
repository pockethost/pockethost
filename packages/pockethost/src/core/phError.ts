export type PhErrorKind = 'user' | 'system'

export type PhError = Error & { phErrorKind?: PhErrorKind }

export const userError = (message: string | Error): PhError => {
  const err = message instanceof Error ? message : new Error(message)
  err.phErrorKind = 'user'
  return err
}

export const systemError = (message: string | Error): PhError => {
  const err = message instanceof Error ? message : new Error(message)
  err.phErrorKind = 'system'
  return err
}

export const isUserError = (err: unknown): err is PhError => err instanceof Error && err.phErrorKind === 'user'

export const isSystemError = (err: unknown): err is PhError => err instanceof Error && err.phErrorKind === 'system'

const DOCKER_RUN_EXIT_CODES = new Set([125, 126, 127])

/** Docker daemon / host resource failures. App exit codes (e.g. JSVM) are user-side. */
export const isPlatformDockerFailure = (statusCode: number, err?: unknown): boolean => {
  if (DOCKER_RUN_EXIT_CODES.has(statusCode)) return true
  const msg = `${err ?? ''}`
  return /connect to the Docker daemon|ECONNREFUSED.*docker|no space left on device|too many open files|EMFILE|ENFILE|Could not get port binding|invalid port binding/i.test(
    msg
  )
}
