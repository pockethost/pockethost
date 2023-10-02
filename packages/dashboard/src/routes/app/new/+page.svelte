<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import { handleCreateNewInstance } from '$util/database'
  import { generateSlug } from 'random-word-slugs'
  import { slide } from 'svelte/transition'

  let instanceName: string = generateSlug(2)
  let formError: string = ''

  // Controls the spin animation of the instance regeneration button
  let rotationCounter: number = 0

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = instanceName.length === 0 || isSubmitting

  const handleInstanceNameRegeneration = () => {
    rotationCounter = rotationCounter + 180
    instanceName = generateSlug(2)
  }

  let isSubmitting = false
  const handleSubmit = async (e: MouseEvent) => {
    e.preventDefault()

    isSubmitting = true
    formError = ''
    await handleCreateNewInstance(instanceName, (error) => {
      formError = error
    }).finally(() => {
      isSubmitting = false
    })
  }
</script>

<svelte:head>
  <title>New Instance - PocketHost</title>
</svelte:head>

<h2 class="text-4xl text-base-content font-bold capitalize mb-6">
  Create A New App
</h2>

<div class="grid lg:grid-cols-2 grid-cols-1">
  <Card>
    <form on:submit={handleSubmit}>
      <CardHeader>Choose a name for your PocketBase app.</CardHeader>

      <div class="flex rename-instance-form-container-query gap-4">
        <input
          type="text"
          bind:value={instanceName}
          class="input input-bordered w-full"
        />

        <button
          type="button"
          class="btn btn-outline btn-secondary"
          aria-label="Regenerate Instance Name"
          on:click={handleInstanceNameRegeneration}
          ><i class="fa-regular fa-arrows-rotate"></i></button
        >
      </div>

      <h4 class="text-center font-bold py-12">
        https://{instanceName}.{PUBLIC_APP_DOMAIN}
      </h4>

      {#if formError}
        <div transition:slide class="alert alert-error mb-5">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{formError}</span>
        </div>
      {/if}

      <div class="flex items-center justify-center gap-4">
        <a href="/dashboard" class="btn">Cancel</a>

        <button class="btn btn-primary" disabled={isFormButtonDisabled}>
          Create <i class="bi bi-arrow-right-short" />
        </button>
      </div>
    </form>
  </Card>
</div>
