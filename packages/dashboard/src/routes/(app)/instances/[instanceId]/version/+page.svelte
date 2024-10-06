<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import VersionPicker from './VersionPicker.svelte'
  import AlertBar from '$components/AlertBar.svelte'

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
      `Are you sure you want to change the version to ${selectedVersion}?`,
    )

    // If they select yes, then update the version in pocketbase
    if (confirmVersionChange) {
      // Save to the database
      errorMessage = ''
      client()
        .updateInstance({
          id,
          fields: { version: selectedVersion },
        })
        .then(() => {
          return 'saved'
        })
        .catch((error) => {
          errorMessage = error.message
        })
    } else {
      // If they hit cancel, reset the version number back to what it was initially
      selectedVersion = version
    }

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<CardHeader documentation={`/docs/upgrading`}>Version Change</CardHeader>

{#if !maintenance}
  <AlertBar
    message="Your instance must be powered off to change the version."
    type="error"
  />
{/if}

<div class="mb-8">
  We recommend you <strong>do a full backup</strong>
  before making a change. We support the latest patch of
  <a href="https://github.com/pocketbase/pocketbase/releases" class="link"
    >every minor release</a
  > of PocketBase.
</div>

<AlertBar message={errorMessage} type="error" />

<form
  class="flex change-version-form-container-query gap-4"
  on:submit={handleSave}
>
  <VersionPicker bind:selectedVersion />

  <button
    type="submit"
    class="btn btn-error"
    disabled={!maintenance || isButtonDisabled}>Change Version</button
  >
</form>

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
