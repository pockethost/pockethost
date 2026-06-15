<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import { isInstanceFullyOff } from '$util/instancePower'

  const { updateInstance } = client()

  $: ({ subdomain, id } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)

  let formSubdomain = subdomain
  $: {
    formSubdomain = subdomain
  }

  let isButtonDisabled = false
  let errorMessage = ''
  let successMessage = ''

  const onRename = (e: Event) => {
    e.preventDefault()

    if (!isFullyOff) return

    errorMessage = ''
    successMessage = ''
    isButtonDisabled = true

    const instanceNameValidation = formSubdomain.trim().replace(/[0-9]/g, '')
    const confirmVersionChange = confirm(`Are you sure you want to rename your instance to ${instanceNameValidation}?`)

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

    isButtonDisabled = false
  }
</script>

<FeatureTab
  title="Rename Instance"
  documentation="/docs/rename-instance"
  powerOffAction="rename this instance"
  {errorMessage}
  {successMessage}
  successFlash
>
  <svelte:fragment slot="summary">
    <p>
      Renaming your instance will cause it to become <strong>inaccessible</strong> by the old instance name. You also may
      not be able to change it back if someone else chooses it.
    </p>
  </svelte:fragment>

  <form class="flex rename-instance-form-container-query gap-4" onsubmit={onRename}>
    <div class="field flex-1">
      <label class="field-label" for="rename-subdomain">Instance name</label>
      <wa-input
        id="rename-subdomain"
        title="Only letters and dashes are allowed"
        type="text"
        value={formSubdomain}
        oninput={(e: Event) => (formSubdomain = (e.currentTarget as HTMLInputElement).value)}
        class="w-full"
        disabled={!isFullyOff}
      ></wa-input>
    </div>

    <wa-button type="submit" variant="danger" disabled={!isFullyOff || isButtonDisabled}>Rename Instance</wa-button>
  </form>
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

  .rename-instance-form-container-query {
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .rename-instance-form-container-query {
      flex-direction: row;
    }
  }
</style>
