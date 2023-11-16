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

export const handleCreateNewInstance = async (
  instanceName: string,
  setError?: FormErrorHandler,
) => {
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
  const { authViaEmail } = client()

  try {
    await client().client.send(`/api/signup`, {
      method: 'POST',
      body: { email, password, instanceName },
    })

    await authViaEmail(email, password)

    const instance = await client().getInstanceBySubdomain(instanceName)

    if (!instance) throw new Error(`This should never happen`)

    window.location.href = `/app/instances/${instance.id}`
  } catch (e) {
    if (e instanceof Error) {
      setError(e.message)
    }
  }
}
