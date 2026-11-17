<script lang="ts">
  import { goto } from '$app/navigation'
  import FeatureTab from '$components/FeatureTab.svelte'
  import { client } from '$src/pocketbase-client'
  import { upsertGlobalInstance, versions } from '$util/stores'
  import { isInstanceFullyOff } from '$util/instancePower'
  import { instance } from '../store'

  const { duplicateInstance } = client()

  $: ({ subdomain, id } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)
  $: isUnfinishedCopy = $instance.duplicateStatus === 'copying' || $instance.duplicateStatus === 'failed'
  $: latestVersion = $versions[0]

  let formSubdomain = ''
  let touched = false
  $: if (!touched) formSubdomain = `${subdomain}-copy`

  let isBusy = false
  let errorMessage = ''

  const onDuplicate = async (e: Event) => {
    e.preventDefault()
    if (!isFullyOff || isUnfinishedCopy || isBusy) return

    errorMessage = ''
    const name = formSubdomain.trim().toLowerCase()
    if (!confirm(`Make a copy of ${subdomain} named ${name}?`)) return

    isBusy = true
    try {
      const { instance: copy } = await duplicateInstance(id, name)
      upsertGlobalInstance(copy)
      await goto(`/instances/${copy.id}`)
    } catch (error) {
      errorMessage = client()
        .parseError(error as Error)
        .join('\n')
    } finally {
      isBusy = false
    }
  }
</script>

<FeatureTab
  title="Duplicate Instance"
  documentation="/docs/duplicate-instance"
  powerOffAction="duplicate this instance"
  {errorMessage}
>
  <svelte:fragment slot="summary">
    <p>
      Make a new instance with a copy of this one's data, files and settings. The copy starts on the latest PocketBase
      version{latestVersion ? ` (${latestVersion})` : ''}, so you can try an upgrade without touching this instance.
    </p>
    <p class="mt-2">
      The copy counts as one of your instances. If it works, rename the two to switch their names. If it doesn't, delete
      the copy and try again.
    </p>
  </svelte:fragment>

  {#if isUnfinishedCopy}
    <p class="text-sm text-white/70">This instance is a copy that isn't ready, so it can't be duplicated.</p>
  {:else}
    <form class="flex duplicate-instance-form-container-query gap-4" onsubmit={onDuplicate}>
      <div class="field flex-1">
        <label class="field-label" for="duplicate-subdomain">Name of the copy</label>
        <wa-input
          id="duplicate-subdomain"
          title="Only letters, numbers and dashes are allowed"
          type="text"
          value={formSubdomain}
          oninput={(e: Event) => {
            touched = true
            formSubdomain = (e.currentTarget as HTMLInputElement).value
          }}
          class="w-full"
          disabled={!isFullyOff || isBusy}
        ></wa-input>
      </div>

      <wa-button type="submit" variant="brand" disabled={!isFullyOff || isBusy} loading={isBusy}
        >Duplicate Instance</wa-button
      >
    </form>
  {/if}
</FeatureTab>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.5);
  }

  .duplicate-instance-form-container-query {
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .duplicate-instance-form-container-query {
      flex-direction: row;
    }
  }
</style>
