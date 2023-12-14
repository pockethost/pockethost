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
