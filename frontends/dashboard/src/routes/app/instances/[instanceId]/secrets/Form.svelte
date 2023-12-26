<script lang="ts">
  import { SECRET_KEY_REGEX, UpdateInstancePayload } from '$shared'
  import { client } from '$src/pocketbase-client/index.js'
  import { reduce } from '@s-libs/micro-dash'
  import { instance } from '../store.js'
  import { items } from './stores.js'
  import AlertBar from '$components/AlertBar.svelte'

  // Keep track of the new key and value to be added
  let secretKey: string = ''
  let secretValue: string = ''

  // These will validate the key and value before being submitted
  let isKeyValid = false
  let isValueValid = false
  let isFormValid = false

  // This will animate a success message when the key is saved
  let successfulSave = false

  // Keep track of any error message
  let errorMessage: string = ''

  // Watch for changes in real time and update the key and value as the user types them
  $: {
    secretKey = secretKey.toUpperCase()
    secretValue = secretValue.trim()
    isKeyValid = !!secretKey.match(SECRET_KEY_REGEX)
    isValueValid = secretValue.length > 0
    isFormValid = isKeyValid && isValueValid
  }

  // Submit the form to create the new environment variable
  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    // Reset any messaging
    errorMessage = ''

    try {
      // Block the button from submitting more than once
      isFormValid = false

      // Save to the database
      items.upsert({ name: secretKey, value: secretValue })
      await client().updateInstance({
        id: $instance.id,
        fields: {
          secrets: reduce(
            $items,
            (c, v) => {
              const { name, value } = v
              c[name] = value
              return c
            },
            {} as NonNullable<UpdateInstancePayload['fields']['secrets']>,
          ),
        },
      })

      // Reset the values when the POST is done
      secretKey = ''
      secretValue = ''

      // Enable the submit button
      isFormValid = true

      // Show the success message
      successfulSave = true

      // Remove the success toast after a few seconds
      setTimeout(() => {
        successfulSave = false
      }, 5000)
    } catch (error: any) {
      errorMessage = error.message
    }
  }
</script>

<div class="mb-8">
  <h4 class="flex items-center font-bold h-9 text-lg mb-3">
    Add an Environment Variable
  </h4>

  <form on:submit={handleSubmit} class="mb-4">
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label class="label" for="secret-key">
          <span class="label-text">Key</span>
        </label>

        <input
          id="secret-key"
          type="text"
          bind:value={secretKey}
          class="input input-bordered w-full max-w-xs"
        />
      </div>

      <div>
        <label class="label" for="secret-value">
          <span class="label-text">Value</span>
        </label>

        <input
          id="secret-value"
          type="text"
          bind:value={secretValue}
          class="input input-bordered w-full max-w-xs"
        />
      </div>
    </div>

    {#if !isKeyValid && secretKey.length > 0}
      <AlertBar
        message="All key names must be upper case, alphanumeric, and may include underscore (_)."
        type="error"
      />
    {/if}

    <div class="text-right">
      <button type="submit" class="btn btn-primary" disabled={!isFormValid}
        >Add <i class="fa-regular fa-floppy-disk"></i></button
      >
    </div>
  </form>

  {#if successfulSave}
    <AlertBar
      message="Your new environment variable has been saved."
      type="success"
    />
  {/if}

  <AlertBar message={errorMessage} type="error" />
</div>
