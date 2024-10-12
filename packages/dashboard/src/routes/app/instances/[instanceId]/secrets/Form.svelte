<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase-client/index.js'
  import { reduce } from '@s-libs/micro-dash'
  import { SECRET_KEY_REGEX, UpdateInstancePayload } from 'pockethost/common'
  import { instance } from '../store.js'
  import { items } from './stores.js'

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

<h3 class="text-xl">Add New Secret</h3>

<div class="mb-8">
  {#if successfulSave}
    <AlertBar
      message="Your new secret has been saved."
      type="success"
    />
  {/if}

  <AlertBar message={errorMessage} type="error" />

  <form on:submit={handleSubmit} class="mb-4">

    <div class="flex flex-row gap-4 mb-4">
      <label class="flex-1 form-control">
        <input
          id="secret-key"
          type="text"
          bind:value={secretKey}
          placeholder="Key"
          class={`input input-bordered ${!isKeyValid && secretKey.length > 0 ? "input-error text-error" : ""}`}
        />
        {#if !isKeyValid && secretKey.length > 0}
          <div class="label">
            <span class="text-error">
              All key names must be upper case, alphanumeric, and may include underscore (_).
            </span>
          </div>
        {/if}

      </label>

      <div class="flex-1 form-control">
        <input
          id="secret-value"
          type="text"
          bind:value={secretValue}
          placeholder="Value"
          class="input input-bordered"
        />
      </div>

      <div class="flex-none text-right">
        <button type="submit" class="btn btn-primary" disabled={!isFormValid}>
          Add <i class="fa-regular fa-floppy-disk"></i>
        </button>
      </div>
    </div>


    <!-- {#if !isKeyValid && secretKey.length > 0}
      <AlertBar
        message="All key names must be upper case, alphanumeric, and may include underscore (_)."
        type="error"
      />
    {/if} -->

  </form>
</div>
