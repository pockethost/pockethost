<script lang="ts">
  import { goto } from '$app/navigation'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { instance } from '../store'
  import ErrorMessage from './ErrorMessage.svelte'

  $: ({ id, maintenance, version } = $instance)

  // Create a copy of the version
  let selectedVersion = version
  $: {
    selectedVersion = version
  }

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // Controls visibility of an error message
  let errorMessage = ''

  // Update the version number
  const handleSave = async (e: Event) => {
    e.preventDefault()

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    // Prompt the user to confirm the version change
    const confirmVersionChange = confirm(
      `LAST CHANCE - Are you sure you want to delete this instance? Your database, all local files, logs, and subdomain will be lost.`,
    )

    // If they select yes, then update the version in pocketbase
    if (confirmVersionChange) {
      errorMessage = ''
      client()
        .deleteInstance({
          id,
        })
        .then(() => {
          globalInstancesStore.update((instances) => {
            const newInstances = { ...instances }
            delete newInstances[id]
            return newInstances
          })
          goto('/')
        })
        .catch((error) => {
          console.error(error)
          errorMessage = error.data.message || error.message
        })
    } else {
      // If they hit cancel, reset the version number back to what it was initially
      selectedVersion = version
    }

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/delete`)}>
    Delete Instance
  </CardHeader>

  <div class="mb-8">
    Deleting your instance will immediately and permanently delete your
    instance:
    <ul class="ml-10 text-error">
      <li>Your subdomain</li>
      <li><pre>pb_data/*</pre></li>
      <li><pre>pb_public/*</pre></li>
      <li><pre>pb_migrations/*</pre></li>
      <li><pre>pb_static/*</pre></li>
    </ul>
    If you are storing files on S3, you must delete them separately.
  </div>

  <ErrorMessage message={errorMessage} />

  <form
    class="flex change-version-form-container-query gap-4"
    on:submit={handleSave}
  >
    <button
      type="submit"
      class="btn btn-error"
      disabled={!maintenance || isButtonDisabled}>Delete Instance</button
    >
  </form>
</Card>

<style>
  .change-version-form-container-query {
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .change-version-form-container-query {
      flex-direction: row;
    }
  }
</style>
