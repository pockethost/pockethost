<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase-client/index.js'
  import { reduce } from '@s-libs/micro-dash'
  import {
    SECRET_KEY_REGEX,
    type UpdateInstancePayload,
  } from 'pockethost/common'
  import { instance } from '../store.js'
  import { items } from './stores.js'
  import { faFloppyDisk, faTrash } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

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

  let pastedSecrets: { key: string; value: string }[] = []
  let isBulkMode = false

  const handlePaste = (e: ClipboardEvent) => {
    if (!e.clipboardData) return

    const clipboardText = e.clipboardData.getData('text/plain')
    const lines = clipboardText.split('\n')
    const validLines: { key: string; value: string }[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) continue

      // Split by the first equals sign
      const parts = trimmedLine.split('=')
      const key = parts[0]?.trim()
      const value = parts.slice(1).join('=').trim()

      // Skip if key or value is empty
      if (!key || !value) continue
      if (!SECRET_KEY_REGEX.test(key)) continue

      validLines.push({ key, value })
    }

    if (validLines.length === 1 && validLines[0]) {
      secretKey = validLines[0].key
      secretValue = validLines[0].value
      isBulkMode = false
    } else if (validLines.length > 1) {
      pastedSecrets = validLines
      isBulkMode = true
    }

    e.preventDefault()
  }

  const handleSaveAll = async () => {
    errorMessage = ''
    if (pastedSecrets.length === 0) return

    for (const { key, value } of pastedSecrets) {
      items.upsert({ name: key, value })
    }

    try {
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

      pastedSecrets = []
      isBulkMode = false
      successfulSave = true
      setTimeout(() => (successfulSave = false), 5000)
    } catch (err: any) {
      errorMessage = err.message
    }
  }

  $: bulkValidation = pastedSecrets.map(({ key, value }) => ({
    keyValid: SECRET_KEY_REGEX.test(key),
    valueValid: value.trim().length > 0,
  }))

  $: isBulkFormValid = bulkValidation.every((v) => v.keyValid && v.valueValid)
</script>

<h3 class="text-xl">Add New Secret</h3>

<div class="mb-8">
  {#if successfulSave}
    <AlertBar message="Your new secret has been saved." type="success" />
  {/if}

  <AlertBar message={errorMessage} type="error" />

  <form on:submit={handleSubmit} class="mb-4">
    {#if isBulkMode && pastedSecrets.length > 0}
      {#each pastedSecrets as item, i}
        <div class="flex flex-row items-center gap-4 mb-2">
          <input
            type="text"
            class={`input input-bordered flex-1 ${!bulkValidation[i]?.keyValid ? 'input-error text-error' : ''}`}
            bind:value={item.key}
            placeholder="Key"
          />
          <input
            type="text"
            class={`input input-bordered flex-1 ${!bulkValidation[i]?.valueValid ? 'input-error text-error' : ''}`}
            bind:value={item.value}
            placeholder="Value"
          />
          <button
            type="button"
            class="btn btn-sm btn-square btn-outline btn-error"
            on:click={() => {
              pastedSecrets.splice(i, 1)
              pastedSecrets = pastedSecrets
            }}
          >
            <Fa icon={faTrash} />
          </button>
        </div>
      {/each}

      <div class="text-right mt-2">
        <button
          type="button"
          class="btn btn-success mt-4"
          on:click={handleSaveAll}
          disabled={!isBulkFormValid}
        >
          Save All <Fa icon={faFloppyDisk} />
        </button>
      </div>
    {:else}
      <div class="flex flex-row gap-4 mb-4">
        <label class="flex-1 form-control">
          <input
            id="secret-key"
            type="text"
            bind:value={secretKey}
            on:paste={handlePaste}
            placeholder="Key"
            class={`input input-bordered ${!isKeyValid && secretKey.length > 0 ? 'input-error text-error' : ''}`}
          />
          {#if !isKeyValid && secretKey.length > 0}
            <div class="label">
              <span class="text-error">
                All key names must be upper case, alphanumeric, and may include
                underscore (_).
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
            Add <Fa icon={faFloppyDisk} />
          </button>
        </div>
      </div>
    {/if}
  </form>
</div>
