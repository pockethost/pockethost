<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase'
  import { instance } from '../store'
  import { slide } from 'svelte/transition'

  $: ({ id, maintenance, version } = $instance)

  // Create a copy of the version
  let instanceVersion = version
  $: {
    instanceVersion = version
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
      `Are you sure you want to change the version to ${instanceVersion}?`,
    )

    // If they select yes, then update the version in pocketbase
    if (confirmVersionChange) {
      // Save to the database
      client()
        .saveVersion({ instanceId: id, version: instanceVersion })
        .then(() => {
          return 'saved'
        })
        .catch((error) => {
          errorMessage = error.message
        })
    } else {
      // If they hit cancel, reset the version number back to what it was initially
      instanceVersion = version
    }

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/upgrading`)}>
    Version Change
  </CardHeader>

  <p class="mb-8">
    Changing your version can only be done when the instance is in maintenance
    mode. We recommend you <strong>do a full backup</strong> before making a
    change. The version number uses the semver syntax and any
    <a
      href="https://www.npmjs.com/package/pocketbase?activeTab=versions"
      class="link">supported PocketBase version</a
    > should work.
  </p>

  {#if errorMessage}
    <div in:slide class="alert alert-error mb-4">
      <i class="fa-regular fa-circle-exclamation"></i>
      {errorMessage}
    </div>
  {/if}

  <form
    class="flex change-version-form-container-query gap-4"
    on:submit={handleSave}
  >
    <input
      required
      type="text"
      bind:value={instanceVersion}
      class="input input-bordered w-full"
    />
    <button
      type="submit"
      class="btn btn-error"
      disabled={!maintenance || isButtonDisabled}>Change Version</button
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
