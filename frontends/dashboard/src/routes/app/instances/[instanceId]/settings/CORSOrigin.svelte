<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from './ErrorMessage.svelte'

  const { updateInstance } = client()

  $: ({ corsOrigins, id } = $instance)

  // Create a copy of the set origins
  let formCorsOrigin = corsOrigins
  $: {
    formCorsOrigin = corsOrigins
  }

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // Controls visibility of an error message
  let errorMessage = ''

  const setCorsOrigin = (e: Event) => {
    e.preventDefault()

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    const trimmed = formCorsOrigin.replace(/\s/g, '')
    // regex to validate origins (example: http://my.domain.com:3000)
    const regex = /^(\*|(,?)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?))/

    if (trimmed.length > 0 && trimmed.includes(',')) {
      for (const origin of trimmed.split(',')) {
        if (!regex.test(origin)) {
          errorMessage = `Invalid origin: ${origin}`
          isButtonDisabled = false
          return
        }
      }
    } else if (trimmed.length > 0 && !regex.test(trimmed)) {
      errorMessage = `Invalid origin: ${trimmed}`
      isButtonDisabled = false
      return
    }

    errorMessage = ''

    updateInstance({
      id,
      fields: {
        corsOrigins: trimmed,
      },
    })
      .then(() => 'Saved')
      .catch((error) => {
        errorMessage = error.message
      })

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/cors`)}>CORS Origin List</CardHeader>

  <p class="mb-8">
    Enter a list of origins that PocketBase should accept requests from.
    <strong>Defaults to "*"</strong>
  </p>

  <ErrorMessage message={errorMessage} />

  <form class="flex rename-instance-form-container-query gap-4"
    on:submit={setCorsOrigin}
  >
    <input
      title="Only a comma seperated list of origins is allowed"
      required
      type="text"
      bind:value={formCorsOrigin}
      class="input input-bordered w-full"
    />

    <button type="submit" class="btn btn-error" disabled={isButtonDisabled}>
      Update Origins
    </button>
  </form>
</Card>
