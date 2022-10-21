<script lang="ts">
  import Protected from '$components/Protected.svelte'
  import { PUBLIC_PB_DOMAIN } from '$env/static/public'
  import { generateSlug } from 'random-word-slugs'
  import { handleCreateNewInstance } from '$util/database'
  import AlertBar from '$components/AlertBar.svelte'

  let instanceName: string = generateSlug(2)
  let formError: string = ''

  // Controls the spin animation of the instance regeneration button
  let rotationCounter: number = 0

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = instanceName.length === 0

  const handleInstanceNameRegeneration = () => {
    rotationCounter = rotationCounter + 180
    instanceName = generateSlug(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    await handleCreateNewInstance(instanceName, (error) => {
      formError = error
    })
  }
</script>

<Protected>
  <div class="container">
    <div class="py-4">
      <h1 class="text-center">Choose a name for your PocketBase app.</h1>
    </div>

    <form on:submit={handleSubmit}>
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
          <span class="form-text">.{PUBLIC_PB_DOMAIN}</span>
        </div>
      </div>

      {#if formError}
        <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
      {/if}

      <div class="text-center">
        <a href="/dashboard" class="btn btn-light">Cancel</a>

        <button type="submit" class="btn btn-primary" disabled={isFormButtonDisabled}>
          Create <i class="bi bi-arrow-right-short" />
        </button>
      </div>
    </form>
  </div>
</Protected>

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
