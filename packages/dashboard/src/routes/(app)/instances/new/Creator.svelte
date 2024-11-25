<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { handleCreateNewInstance } from '$util/database'
  import {
    faArrowsRotate,
    faCircleExclamation,
  } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'
  import { writable } from 'svelte/store'
  import { slide } from 'svelte/transition'
  import VersionPicker from '../[instanceId]/version/VersionPicker.svelte'
  import { versions } from '$util/stores'

  let selectedVersion = $versions[0]!

  const instanceNameField = writable('')
  const instanceInfo = writable({
    name: '',
    fetching: true,
    available: false,
  })

  const generateSlug = async () => {
    instanceInfo.update((info) => ({ ...info, fetching: true }))
    const { instanceName: name } = await client().client.send(`/api/signup`, {})
    instanceInfo.update((info) => ({
      ...info,
      available: true,
      name,
      fetching: false,
    }))
    instanceNameField.set(name)
  }

  instanceNameField.subscribe(async (name) => {
    if (name !== $instanceInfo.name) {
      try {
        instanceInfo.update((info) => ({
          ...info,
          fetching: true,
        }))

        await client().client.send(
          `/api/signup?name=${encodeURIComponent(name)}`,
          {},
        )

        instanceInfo.update((info) => ({
          ...info,
          fetching: false,
          available: true,
          name,
        }))
      } catch (e) {
        instanceInfo.update((info) => ({
          ...info,
          fetching: false,
          available: false,
          name,
        }))
      }
    }
  })

  // Generate the initial slug on load
  generateSlug()

  let formError: string = ''
  let isSubmitting = false

  // Disable the form button until all fields are filled out
  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled =
    $instanceInfo.name.length === 0 || !$instanceInfo.available

  // Generate a unique name for the PocketHost instance
  const handleInstanceNameRegeneration = () => {
    generateSlug()
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    isSubmitting = true
    formError = ''

    await handleCreateNewInstance(
      $instanceNameField,
      selectedVersion,
      (error) => {
        formError = error
      },
    ).finally(async () => {
      isSubmitting = false
    })
  }
</script>

<Card>
  <form on:submit={handleSubmit}>
    <CardHeader>Choose a name for your PocketBase instance.</CardHeader>

    <div class="flex rename-instance-form-container-query gap-4">
      <input
        type="text"
        bind:value={$instanceNameField}
        class="input input-bordered w-full"
      />

      <button
        type="button"
        class="btn btn-outline btn-secondary"
        aria-label="Regenerate Instance Name"
        on:click={handleInstanceNameRegeneration}
        ><Fa icon={faArrowsRotate} /></button
      >
    </div>

    <div style="font-size: 15px;" class="p-2 mb-8">
      {#if $instanceInfo.fetching}
        Verifying...
      {:else if $instanceInfo.available}
        <span class="text-success">
          https://{$instanceInfo.name}.pockethost.io ✔︎</span
        >
      {:else}
        <span class="text-error">
          https://{$instanceInfo.name}.pockethost.io ❌</span
        >
      {/if}
    </div>

    {#if formError}
      <div transition:slide class="alert alert-error mb-5">
        <Fa icon={faCircleExclamation} />
        <span>{formError}</span>
      </div>
    {/if}

    <div class="flex items-center justify-center gap-4 mb-8">
      <VersionPicker bind:selectedVersion versions={$versions} />
    </div>

    <div class="flex items-center justify-center gap-4">
      <a href="/" class="btn">Cancel</a>

      <button
        type="submit"
        class="btn btn-primary"
        disabled={isFormButtonDisabled}
      >
        {#if isSubmitting}
          <span class="loading loading-spinner loading-md"></span>
        {:else}
          Create <i class="bi bi-arrow-right-short" />
        {/if}
      </button>
    </div>
  </form>
</Card>
