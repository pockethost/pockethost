<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import AlertBar from '$components/AlertBar.svelte'

  const { updateInstance } = client()

  $: ({ subdomain, id } = $instance)

  // Create a copy of the subdomain
  let formSubdomain = subdomain
  $: {
    formSubdomain = subdomain
  }

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // Controls visibility of an error message
  let errorMessage = ''

  let successMessage = ''

  // TODO: What are the limits for this?
  const onRename = (e: Event) => {
    e.preventDefault()

    errorMessage = ''
    successMessage = ''

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    // Remove extra whitespace, and numbers from the subdomain
    const instanceNameValidation = formSubdomain.trim().replace(/[0-9]/g, '')

    // Prompt the user to confirm the version change
    const confirmVersionChange = confirm(`Are you sure you want to rename your instance to ${instanceNameValidation}?`)

    // If they select yes, then update the version in pocketbase
    if (confirmVersionChange) {
      updateInstance({
        id,
        fields: {
          subdomain: instanceNameValidation,
        },
      })
        .then(() => {
          successMessage = 'Instance renamed successfully'
        })
        .catch((error) => {
          errorMessage = client().parseError(error).join('\n')
        })
    }

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<div class="max-w-2xl">
  <CardHeader documentation={`/docs/rename-instance`}>Rename Instance</CardHeader>

  <p class="mb-8">
    Renaming your instance will cause it to become <strong class="text-error">inaccessible</strong> by the old instance name.
    You also may not be able to change it back if someone else choose it.
  </p>

  <AlertBar message={successMessage} type="success" flash />
  <AlertBar message={errorMessage} type="error" />

  <form class="flex rename-instance-form-container-query gap-4" on:submit={onRename}>
    <input
      title="Only letters and dashes are allowed"
      required
      type="text"
      bind:value={formSubdomain}
      class="input input-bordered w-full"
    />

    <button type="submit" class="btn btn-error" disabled={isButtonDisabled}>Rename Instance</button>
  </form>

  <style>
    .rename-instance-form-container-query {
      flex-direction: column;
    }

    @container (min-width: 400px) {
      .rename-instance-form-container-query {
        flex-direction: row;
      }
    }
  </style>
</div>
