import { client } from '$src/pocketbase'
import { InstanceStatus } from '@pockethost/common'
import { redirect } from './redirect'
const { authViaEmail, createUser, user, createInstance } = client

export type FormErrorHandler = (value: string) => void

export const handleFormError = (error: any, setError?: FormErrorHandler) => {
  console.error(`Form error: ${error}`, { error })
  if (setError) {
    const message = client.parseError(error)[0]
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
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    await authViaEmail(email, password)

    if (shouldRedirect) {
      redirect('/dashboard')
    }
  } catch (error: any) {
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
  // Reset the form error if the form is submitted
  setError?.('')

  try {
    await createUser(email, password)
  } catch (error: any) {
    handleFormError(error, setError)
  }
}

export const handleCreateNewInstance = async (
  instanceName: string,
  setError?: FormErrorHandler
) => {
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
      status: InstanceStatus.Idle
    })

    redirect(`/app/instances/${record.id}`)
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
  try {
    // Handle user creation/signin
    // First, attempt to log in using the provided credentials.
    // If they have a password manager or anything like that, it will have
    // populated the form with their existing login. Try using it.
    await handleLogin(email, password, undefined, false)
      .then(() => {
        console.log(`Account ${email} already exists. Logged in.`)
      })
      .catch((e) => {
        console.warn(`Login failed, attempting account creation.`)
        // This means login has failed.
        // Either their credentials were incorrect, or the account
        // did not exist, or there is a system issue.
        // Try creating the account. This will fail if the email address
        // is already in use.
        return handleRegistration(email, password)
          .then(() => {
            console.log(`Account created, proceeding to log in.`)
            // This means registration succeeded. That's good.
            // Log in using the new credentials
            return handleLogin(email, password, undefined, false)
              .then(() => {
                console.log(`Logged in after account creation`)
              })
              .catch((e) => {
                console.error(`Panic, auth system down`)
                // This should never happen.
                // If registration succeeds, login should always succeed.
                // If a login fails at this point, the system is broken.
                throw new Error(
                  `Login system is currently down. Please contact us so we can fix this.`
                )
              })
          })
          .catch((e) => {
            console.warn(`User input error`)
            // This is just for clarity
            // If registration fails at this point, it means both
            // login and account creation failed.
            // This means there is something wrong with the user input.
            // Bail out to show errors
            // Transform the errors so they mention a problem with account creation.
            const messages = client.parseError(e)
            throw new Error(`Account creation: ${messages[0]}`)
          })
      })

    console.log(`User before instance creation is `, user())
    // We can only get here if we are successfully logged in using the credentials
    // provided by the user.
    // Instance creation could still fail if the name is taken
    await handleCreateNewInstance(instanceName)
      .then(() => {
        console.log(`Creation of ${instanceName} succeeded`)
      })
      .catch((e) => {
        console.warn(`Creation of ${instanceName} failed`)
        // The instance creation could most likely fail if the name is taken.
        // In any case, bail out to show errors.
        if (e.data?.data?.subdomain?.code === 'validation_not_unique') {
          // Handle this special and common case
          throw new Error(`Instance name already taken.`)
        }
        // The errors remaining errors are kind of generic, so transofrm them into something about
        // the instance name.
        const messages = client.parseError(e)
        throw new Error(`Instance creation: ${messages[0]}`)
      })
  } catch (error: any) {
    console.error(`Caught widget error`, { error })
    handleFormError(error, setError)
  }
}
