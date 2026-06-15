<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import VersionPicker from './VersionPicker.svelte'
  import AlertBar from '$components/AlertBar.svelte'
  import PowerOffRequired from '../PowerOffRequired.svelte'
  import { versions } from '$src/util/stores'
  import { isInstanceFullyOff } from '$util/instancePower'

  $: ({ id, version } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)

  const minorVersion = (v: string) => Number(v.split('.')[1] ?? 0)

  const crossesV23Boundary = (from: string, to: string) => {
    const fromMinor = minorVersion(from)
    const toMinor = minorVersion(to)
    return (fromMinor <= 22 && toMinor >= 23) || (fromMinor >= 23 && toMinor <= 22)
  }

  const confirmVersionChangeMessage = (from: string, to: string) => {
    if (crossesV23Boundary(from, to)) {
      if (minorVersion(to) >= 23) {
        return `v0.23+ rewrites PocketBase JSVM APIs. Back up first and review any custom pb_hooks before upgrading.\n\nChange version to ${to}?`
      }
      return `Downgrading across the v0.23 boundary is not supported by PocketBase and may break your instance.\n\nChange version to ${to}?`
    }
    return `Are you sure you want to change the version to ${to}?`
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

    if (!isFullyOff) return

    errorMessage = ''
    successMessage = ''

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    const confirmVersionChange = confirm(confirmVersionChangeMessage(version, selectedVersion))

    if (confirmVersionChange) {
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
      selectedVersion = version
    }

    isButtonDisabled = false
  }
</script>

<CardHeader documentation={`/docs/versions`}>Version Change</CardHeader>

<PowerOffRequired action="change the version" />

<div class="mb-8">
  We recommend you <strong>do a full backup</strong>
  before making a change. We support the latest patch of
  <a href="https://github.com/pocketbase/pocketbase/releases" class="text-primary">every minor release</a> of PocketBase.
</div>

{#if minorVersion(version) <= 22}
  <wa-callout variant="warning" class="mb-8">
    <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
    <p>
      Upgrading to <strong>v0.23+</strong> applies PocketBase's JSVM API changes on your existing data.
      <a href="https://github.com/pocketbase/pocketbase/releases/tag/v0.23.0" class="text-primary"
        >Review the v0.23 migration notes</a
      >
      if you use custom <code>pb_hooks</code>.
    </p>
  </wa-callout>
{/if}

<AlertBar message={successMessage} type="success" flash />
<AlertBar message={errorMessage} type="error" />

<form class="flex change-version-form-container-query gap-4" onsubmit={handleSave}>
  <VersionPicker bind:selectedVersion versions={$versions} disabled={!isFullyOff} />

  <wa-button type="submit" variant="danger" disabled={!isFullyOff || isButtonDisabled}>Change Version</wa-button>
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
