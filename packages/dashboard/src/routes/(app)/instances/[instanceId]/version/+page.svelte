<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import VersionPicker from './VersionPicker.svelte'
  import { versions } from '$src/util/stores'
  import { isInstanceFullyOff } from '$util/instancePower'

  $: ({ id, version } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)
  $: showV23Notice = minorVersion(version) <= 22

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

  let selectedVersion = version
  $: {
    selectedVersion = version
  }

  let isButtonDisabled = false
  let errorMessage = ''
  let successMessage = ''

  const handleSave = async (e: Event) => {
    e.preventDefault()

    if (!isFullyOff) return

    errorMessage = ''
    successMessage = ''
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

<FeatureTab
  title="Version Change"
  documentation="/docs/versions"
  powerOffAction="change the version"
  bind:errorMessage
  {successMessage}
  successFlash
>
  {#snippet alerts()}
    {#if showV23Notice}
      <wa-callout variant="warning" class="wa-callout-padded mb-4">
        <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
        <p>
          PocketBase <strong>v0.23+</strong> changes the JSVM API. Custom <code>pb_hooks</code> written for v0.22 or
          earlier may need updates before you upgrade.
          <a href="https://github.com/pocketbase/pocketbase/releases/tag/v0.23.0" class="text-primary"
            >Review the v0.23 release notes</a
          >.
        </p>
      </wa-callout>
    {/if}
  {/snippet}

  {#snippet summary()}
    <p>
      We recommend you <strong>do a full backup</strong>
      before making a change. We support the latest patch of
      <a href="https://github.com/pocketbase/pocketbase/releases" class="text-primary">every minor release</a> of
      PocketBase.
    </p>
  {/snippet}

  <form class="flex change-version-form-container-query gap-4" onsubmit={handleSave}>
    <VersionPicker bind:selectedVersion versions={$versions} disabled={!isFullyOff} />
    <wa-button type="submit" variant="danger" disabled={!isFullyOff || isButtonDisabled}>Change Version</wa-button>
  </form>
</FeatureTab>

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
