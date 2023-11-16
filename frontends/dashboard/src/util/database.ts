import { goto } from '$app/navigation'
import { client } from '$src/pocketbase-client'

export type FormErrorHandler = (value: string) => void

export const handleFormError = (e: Error, setError?: FormErrorHandler) => {
  const { parseError } = client()

  if (setError) {
    const message = parseError(e)[0]
    setError(message || 'Unknown message')
  } else {
    throw e
  }
}

/**
 * This will log a user into Pocketbase, and includes an optional error handler
 * @param {string} email The email of the user
 * @param {string} password The password of the user
 */
export const handleLogin = async (email: string, password: string) => {
  const { authViaEmail } = client()

  return await authViaEmail(email, password)
}

/**
 * This will register a new user into Pocketbase, and includes an optional error handler
 * @param email {string} The email of the user
 * @param password {string} The password of the user
 */
export const handleRegistration = async (email: string, password: string) => {
  const { createUser } = client()

  return await createUser(email, password)
}

/**
 * This will let a user confirm their new account email, and includes an optional error handler
 * @param token {string} The token from the verification email
 */
export const handleAccountConfirmation = async (token: string) => {
  const { confirmVerification } = client()

  return await confirmVerification(token)
}

/**
 * This will reset an unauthenticated user's password by sending a verification link to their email, and includes an optional error handler
 * @param email {string} The email of the user
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 */
export const handleUnauthenticatedPasswordReset = async (
  email: string,
  setError?: FormErrorHandler,
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
  setError?: FormErrorHandler,
) => {
  const { requestPasswordResetConfirm } = client()
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    await requestPasswordResetConfirm(token, password)

    await goto('/')
  } catch (error: any) {
    handleFormError(error, setError)
  }

  return false
}

export const handleCreateNewInstance = async (
  instanceName: string,
  setError?: FormErrorHandler,
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
  setError = (value: string) => {},
) => {
  try {
    await client().client.send(`/api/signup`, {
      method: 'POST',
      body: { email, password, instanceName },
    })
    await handleLogin(email, password)
    const instance = await client().getInstanceBySubdomain(instanceName)
    if (!instance) throw new Error(`This should never happen`)
    window.location.href = `/app/instances/${instance.id}`
  } catch (e) {
    if (e instanceof Error) {
      setError(e.message)
    }
  }
}

export const handleResendVerificationEmail = async (
  setError = (value: string) => {},
) => {
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
