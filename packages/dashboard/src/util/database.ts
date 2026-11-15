import { goto } from '$app/navigation'
import { client } from '$src/pocketbase-client'
import { AFTER_CHECKOUT_PATH, startCheckout } from '$util/billing'
import { upsertGlobalInstance } from '$util/stores'

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

export const handleCreateNewInstance = async (instanceName: string, setError?: FormErrorHandler) => {
  const { user, createInstance } = client()
  // Get the newly created user id
  const { id } = user() || {}

  try {
    // Pre-checks
    if (!instanceName) throw new Error(`Instance name is required`)
    if (!id) throw new Error(`Must be logged in to create an instance`)

    // Create a new instance using the generated name
    const record = await createInstance({
      subdomain: instanceName,
    })

    upsertGlobalInstance(record.instance)
    await goto(`/instances/${record.instance.id}`)
  } catch (error: any) {
    handleFormError(error, setError)
  }
}

export const continueCheckoutAfterAuth = async (checkoutPvId: string, setError?: FormErrorHandler) => {
  try {
    await startCheckout(checkoutPvId, () => goto(AFTER_CHECKOUT_PATH))
  } catch (e) {
    handleFormError(e instanceof Error ? e : new Error(`${e}`), setError)
  }
}

/**
 * Pay-first signup: create the account (no instance), log in, send the verification email, then open checkout for the
 * chosen plan. The first instance is named and created after payment, on AFTER_CHECKOUT_PATH.
 */
export const signupAndCheckout = async (
  email: string,
  password: string,
  checkoutPvId: string,
  setError: FormErrorHandler
) => {
  const { authViaEmail } = client()
  try {
    await client().client.collection('users').create({ email, password, passwordConfirm: password })
    await authViaEmail(email, password)
    client()
      .client.collection('users')
      .requestVerification(email)
      .catch((e) => console.error(`verification email`, e))
  } catch (e) {
    const err = e instanceof Error ? e : new Error(`${e}`)
    const message = client().parseError(err)[0] || err.message
    setError(/unique|already/i.test(message) ? `That email already has an account. Log in instead.` : message)
    return false
  }
  await continueCheckoutAfterAuth(checkoutPvId, setError)
  return true
}
