import { goto } from '$app/navigation'
import { client } from '$src/pocketbase'
import { logger } from '@pockethost/common'

export type FormErrorHandler = (value: string) => void

export const handleFormError = (e: Error, setError?: FormErrorHandler) => {
  const { parseError } = client()
  const { dbg, error, warn } = logger()
  error(`Form error: ${e}`, { error: e })

  if (setError) {
    const message = parseError(e)[0]
    setError(message)
  } else {
    throw e
  }
}

/**
 * This will log a user into Pocketbase, and includes an optional error handler
 * @param email {string} The email of the user
 * @param password {string} The password of the user
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 * @param shouldRedirect {boolean} This will redirect the user to the dashboard when they are logged in
 */
export const handleLogin = async (
  email: string,
  password: string,
  setError?: FormErrorHandler,
  shouldRedirect: boolean = true
) => {
  const { authViaEmail } = client()
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    await authViaEmail(email, password)

    if (shouldRedirect) {
      await goto('/dashboard')
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error(`Expected Error type here, but got ${typeof error}:${error}`)
    }
    handleFormError(error, setError)
  }
}

/**
 * This will register a new user into Pocketbase, and includes an optional error handler
 * @param email {string} The email of the user
 * @param password {string} The password of the user
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 */
export const handleRegistration = async (
  email: string,
  password: string,
  setError?: FormErrorHandler
) => {
  const { createUser } = client()
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    await createUser(email, password)
  } catch (error: any) {
    handleFormError(error, setError)
  }
}

/**
 * This will let a user confirm their new account email, and includes an optional error handler
 * @param token {string} The token from the verification email
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 */
export const handleAccountConfirmation = async (token: string, setError?: FormErrorHandler) => {
  const { confirmVerification } = client()
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    await confirmVerification(token)

    window.location.href = '/dashboard'
  } catch (error: any) {
    handleFormError(error, setError)
  }

  return false
}

/**
 * This will reset an unauthenticated user's password by sending a verification link to their email, and includes an optional error handler
 * @param email {string} The email of the user
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 */
export const handleUnauthenticatedPasswordReset = async (
  email: string,
  setError?: FormErrorHandler
) => {
  const { requestPasswordReset } = client()
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    return await requestPasswordReset(email)
  } catch (error: any) {
    handleFormError(error, setError)
  }

  return false
}

/**
 * This will let an unauthenticated user save a new password after verifying their email, and includes an optional error handler
 * @param token {string} The token from the verification email
 * @param password {string} The new password of the user
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 */
export const handleUnauthenticatedPasswordResetConfirm = async (
  token: string,
  password: string,
  setError?: FormErrorHandler
) => {
  const { requestPasswordResetConfirm } = client()
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    await requestPasswordResetConfirm(token, password)

    await goto('/dashboard')
  } catch (error: any) {
    handleFormError(error, setError)
  }

  return false
}

export const handleCreateNewInstance = async (
  instanceName: string,
  setError?: FormErrorHandler
) => {
  const { user, createInstance } = client()
  // Get the newly created user id
  const { id } = user() || {}

  try {
    // Prechecks
    if (!instanceName) throw new Error(`Instance name is required`)
    if (!id) throw new Error(`Must be logged in to create an instance`)

    // Create a new instance using the generated name
    const record = await createInstance({
      subdomain: instanceName
    })

    await goto(`/app/instances/${record.instance.id}`)
  } catch (error: any) {
    handleFormError(error, setError)
  }
}

export const handleInstanceGeneratorWidget = async (
  email: string,
  password: string,
  instanceName: string,
  setError = (value: string) => {}
) => {
  const { dbg, error, warn } = logger()

  const { user, parseError } = client()
  try {
    // Handle user creation/signin
    // First, attempt to log in using the provided credentials.
    // If they have a password manager or anything like that, it will have
    // populated the form with their existing login. Try using it.
    await handleLogin(email, password, undefined, false)
      .then(() => {
        dbg(`Account ${email} already exists. Logged in.`)
      })
      .catch((e) => {
        warn(`Login failed, attempting account creation.`)
        // This means login has failed.
        // Either their credentials were incorrect, or the account
        // did not exist, or there is a system issue.
        // Try creating the account. This will fail if the email address
        // is already in use.
        return handleRegistration(email, password)
          .then(() => {
            dbg(`Account created, proceeding to log in.`)
            // This means registration succeeded. That's good.
            // Log in using the new credentials
            return handleLogin(email, password, undefined, false)
              .then(() => {
                dbg(`Logged in after account creation`)
              })
              .catch((e) => {
                error(`Panic, auth system down`)
                // This should never happen.
                // If registration succeeds, login should always succeed.
                // If a login fails at this point, the system is broken.
                throw new Error(
                  `Login system is currently down. Please contact us so we can fix this.`
                )
              })
          })
          .catch((e) => {
            warn(`User input error`)
            // This is just for clarity
            // If registration fails at this point, it means both
            // login and account creation failed.
            // This means there is something wrong with the user input.
            // Bail out to show errors
            // Transform the errors so they mention a problem with account creation.
            const messages = parseError(e)
            throw new Error(`Account creation: ${messages[0]}`)
          })
      })

    dbg(`User before instance creation is `, user())
    // We can only get here if we are successfully logged in using the credentials
    // provided by the user.
    // Instance creation could still fail if the name is taken
    await handleCreateNewInstance(instanceName)
      .then(() => {
        dbg(`Creation of ${instanceName} succeeded`)
      })
      .catch((e) => {
        warn(`Creation of ${instanceName} failed`)
        // The instance creation could most likely fail if the name is taken.
        // In any case, bail out to show errors.
        if (e.data?.data?.subdomain?.code === 'validation_not_unique') {
          // Handle this special and common case
          throw new Error(`Instance name already taken.`)
        }
        // The errors remaining errors are kind of generic, so transofrm them into something about
        // the instance name.
        const messages = parseError(e)
        throw new Error(`Instance creation: ${messages[0]}`)
      })
  } catch (error: any) {
    error(`Caught widget error`, { error })
    handleFormError(error, setError)
  }
}

export const handleResendVerificationEmail = async (setError = (value: string) => {}) => {
  const { resendVerificationEmail } = client()
  try {
    await resendVerificationEmail()
  } catch (error: any) {
    handleFormError(error, setError)
  }
}

export const handleLogout = () => {
  const { logOut } = client()
  // Clear the Pocketbase session
  logOut()
}

export const handleLogoutAndRedirect = () => {
  handleLogout()

  // Hard refresh to make sure any remaining data is cleared
  window.location.href = '/'
}
