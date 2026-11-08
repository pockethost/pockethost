<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import VersionPicker from './VersionPicker.svelte'
  import { versions } from '$src/util/stores'
  import { isInstanceFullyOff } from '$util/instancePower'
  import { LEGACY_SUNSET_DATE } from '$lib/legacySunset'

  $: ({ id, version } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)
  $: showV23Notice = minorVersion(version) <= 22

  const minorVersion = (v: string) => Number(v.split('.')[1] ?? 0)

  const confirmVersionChangeMessage = (from: string, to: string) => {
    if (minorVersion(from) <= 22 && minorVersion(to) >= 23) {
      return `v0.23+ rewrites PocketBase JSVM APIs. Back up first and review any custom pb_hooks before upgrading.\n\nChange version to ${to}?`
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
  <svelte:fragment slot="alerts">
    {#if showV23Notice}
      <wa-callout variant="warning" class="wa-callout-padded mb-4">
        <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
        <p>
          PocketBase <strong>v0.23+</strong> changes the JSVM API. Custom <code>pb_hooks</code> written for v0.22 or
          earlier may need updates before you upgrade. Versions 0.22 and older can't be selected anymore, and instances
          still on them will be suspended and archived on {LEGACY_SUNSET_DATE}.
          <a href="https://github.com/pocketbase/pocketbase/releases/tag/v0.23.0" class="text-primary"
            >Review the v0.23 release notes</a
          >.
        </p>
      </wa-callout>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="summary">
    <p>
      We recommend you <strong>do a full backup</strong>
      before making a change. We support the latest patch of
      <a href="https://github.com/pocketbase/pocketbase/releases" class="text-primary">every minor release</a> of PocketBase
      from 0.23 on.
    </p>
  </svelte:fragment>

  <form class="flex change-version-form-container-query gap-4" onsubmit={handleSave}>
    <VersionPicker bind:selectedVersion versions={$versions} currentVersion={version} disabled={!isFullyOff} />
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
