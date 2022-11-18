import { goto } from '$app/navigation'
import { client } from '$src/pocketbase'
import { isFirstTimeRegistration, isUserLoggedIn } from '$util/stores'
import { InstanceStatus, LATEST_PLATFORM, USE_LATEST_VERSION } from '@pockethost/common'
import { get } from 'svelte/store'

export type FormErrorHandler = (value: string) => void

export const handleFormError = (error: any, setError?: FormErrorHandler) => {
  const { parseError } = client()
  console.error(`Form error: ${error}`, { error })

  if (setError) {
    const message = parseError(error)[0]
    setError(message)
  } else {
    throw error
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
  } catch (error: any) {
    handleFormError(error, setError)
  }
}

/**
 * This will register a new user into Pocketbase, and includes an optional error handler. It also sets a global state `isFirstTimeRegistration` to show an intro screen for new users on the dashboard
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

    // Update new user state
    isFirstTimeRegistration.set(true)
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

    await goto('/dashboard')
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
      subdomain: instanceName,
      uid: id,
      status: InstanceStatus.Idle,
      platform: LATEST_PLATFORM,
      version: USE_LATEST_VERSION
    })

    await goto(`/app/instances/${record.id}`)
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
  const { user, parseError } = client()

  const isUserLoggedInState = get(isUserLoggedIn)

  try {
    // Don't perform this part if the user is already logged in
    if (!isUserLoggedInState) {
      // Handle user creation / sign in
      // First, attempt to log in using the provided credentials.
      try {
        await handleLogin(email, password, undefined, false)
      } catch (loginError) {
        // This means login has failed. Either their credentials were incorrect, or the account did not exist, or there is a system issue.
        // Try creating the account. This will fail if the email address is already in use.
        try {
          await handleLogin(email, password, undefined, false)
        } catch (registrationError) {
          await handleRegistration(email, password)

          try {
            // This means registration succeeded, so log in with the new credentials
            await handleLogin(email, password, undefined, false)
          } catch (secondaryLoginError) {
            // If login fails after registration, it's safe to assume that the PocketHost system is experiencing issues
            throw new Error(`Login system is currently down. Please contact us so we can fix this.`)
          }
        }
      }
    }

    console.log(`User before instance creation is `, user())
    // We can only get here if we are successfully logged in using the credentials provided by the user.
    // Instance creation could still fail if the name is taken
    try {
      await handleCreateNewInstance(instanceName)
      await goto('/dashboard')
    } catch (instanceError: any) {
      // The instance creation could most likely fail if the name is taken. In any case, bail out to show errors.
      if (instanceError.data?.data?.subdomain?.code === 'validation_not_unique') {
        // Handle this special and common case
        throw new Error(`Instance name already taken.`)
      }
      // The errors remaining errors are kind of generic, so transform them into something about the instance name.
      const messages = parseError(instanceError)
      throw new Error(`Instance creation: ${messages[0]}`)
    }
  } catch (error: any) {
    console.error(`Caught widget error`, { error })
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
