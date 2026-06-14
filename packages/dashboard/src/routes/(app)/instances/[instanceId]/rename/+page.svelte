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

<CardHeader documentation={`/docs/rename-instance`}>Rename Instance</CardHeader>

<p class="text-white/70 text-sm mb-6 leading-relaxed">
    Renaming your instance will cause it to become <strong class="text-error">inaccessible</strong> by the old instance name.
    You also may not be able to change it back if someone else choose it.
  </p>

  <AlertBar message={successMessage} type="success" flash />
  <AlertBar message={errorMessage} type="error" />

  <form class="flex rename-instance-form-container-query gap-4" onsubmit={onRename}>
    <div class="field flex-1">
      <label class="field-label" for="rename-subdomain">Instance name</label>
      <wa-input
        id="rename-subdomain"
        title="Only letters and dashes are allowed"
        type="text"
        value={formSubdomain}
        oninput={(e) => (formSubdomain = e.currentTarget.value)}
        class="w-full"
      ></wa-input>
    </div>

    <wa-button type="submit" variant="danger" disabled={isButtonDisabled}>Rename Instance</wa-button>
  </form>

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
