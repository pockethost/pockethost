<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import VersionPicker from './VersionPicker.svelte'
  import AlertBar from '$components/AlertBar.svelte'
  import { versions as allVersions, is23Available } from '$src/util/stores'

  $: ({ id, power, version } = $instance)

  let is22OrLower = false
  let is23OrHigher = false
  $: {
    const [major, minor] = version.split('.').map(Number)
    is22OrLower = minor! <= 22
    is23OrHigher = minor! >= 23
  }

  let versions: string[] = []
  $: {
    versions = $allVersions.filter((v) => {
      const [major, minor] = v.split('.').map(Number)
      return (is22OrLower && minor! <= 22) || (is23OrHigher && minor! >= 23)
    })
  }

  // Create a copy of the version
  let selectedVersion = version
  $: {
    selectedVersion = version
  }

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // Controls visibility of an error message
  let errorMessage = ''
  let successMessage = ''

  // Update the version number
  const handleSave = async (e: Event) => {
    e.preventDefault()

    errorMessage = ''
    successMessage = ''

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    // Prompt the user to confirm the version change
    const confirmVersionChange = confirm(`Are you sure you want to change the version to ${selectedVersion}?`)

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
          successMessage = 'Version updated successfully'
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

<div class="max-w-xl">
  {#if power}
    <AlertBar message="Your instance must be powered off to change the version." type="error" />
  {/if}

  <div class="mb-8">
    We recommend you <strong>do a full backup</strong>
    before making a change. We support the latest patch of
    <a href="https://github.com/pocketbase/pocketbase/releases" class="link">every minor release</a> of PocketBase.
  </div>

  {#if !is23OrHigher}
    <div class="mb-8 bg-info p-4 rounded text-info-content">
      <p class="font-bold text-xl">Attention v0.23.* users:</p>
      <p>v0.22.* to v0.23.* is a major migration boundary and requires a manual migration process.</p>
      <table class="table">
        <thead class="text-info-content">
          <tr>
            <td>Current Version</td>
            <td>Desired Version</td>
            <td>How to upgrade</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>&lt;=v0.22.*</td>
            <td>v0.23.*</td>
            <td
              >Create a new v0.23.* instance and follow the <a
                href="https://github.com/pocketbase/pocketbase/releases/tag/v0.23.0"
                class="link">manual upgrade process</a
              >.</td
            >
          </tr>
          <tr>
            <td>0.23.*</td>
            <td>&lt;=v0.22.*</td>
            <td
              >Create a new &lt;=v0.22.* instance and migrate your data manually. Refer to the <a
                href="https://github.com/pocketbase/pocketbase/releases/tag/v0.23.0"
                class="link">v0.23.* manual upgrade process</a
              > and attempt to reverse it.</td
            >
          </tr>
        </tbody>
      </table>
    </div>
  {/if}

  <AlertBar message={successMessage} type="success" flash />
  <AlertBar message={errorMessage} type="error" />

  <form class="flex change-version-form-container-query gap-4" on:submit={handleSave}>
    <VersionPicker bind:selectedVersion bind:versions />

    <button type="submit" class="btn btn-error" disabled={power || isButtonDisabled}>Change Version</button>
  </form>
</div>

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
