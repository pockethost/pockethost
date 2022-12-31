<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import { handleCreateNewInstance } from '$util/database'
  import { generateSlug } from 'random-word-slugs'

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

<div class="container">
  <div class="py-4">
    <h1 class="text-center">Choose a name for your PocketBase app.</h1>
  </div>

  <div class="row g-3 align-items-center justify-content-center mb-4">
    <div class="col-auto">
      <label for="instance-name" class="col-form-label">Instance Name:</label>
    </div>

    <div class="col-auto pe-1 position-relative">
      <input type="text" id="instance-name" class="form-control" bind:value={instanceName} />

      <button
        aria-label="Regenerate Instance Name"
        type="button"
        style="transform: rotate({rotationCounter}deg);"
        class="btn btn-light rounded-circle regenerate-instance-name-btn"
        on:click={handleInstanceNameRegeneration}
      >
        <i class="bi bi-arrow-repeat" />
      </button>
    </div>

    <div class="col-auto ps-0">
      <span class="form-text">.{PUBLIC_APP_DOMAIN}</span>
    </div>
  </div>

  {#if formError}
    <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
  {/if}

  <div class="text-center">
    <a href="/dashboard" class="btn btn-light" disabled={isFormButtonDisabled}>Cancel</a>

    <button class="btn btn-primary" disabled={isFormButtonDisabled} on:click={handleSubmit}>
      Create <i class="bi bi-arrow-right-short" />
    </button>
  </div>
</div>

<style lang="scss">
  .container {
    max-width: 600px;
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  .regenerate-instance-name-btn {
    padding: 0;
    width: 34px;
    height: 34px;
    position: absolute;
    z-index: 500;
    top: 2px;
    right: 6px;
    transition: all 200ms;
  }
</style>
