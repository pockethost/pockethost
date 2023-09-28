<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { handleInstanceGeneratorWidget } from '$util/database'
  import { getRandomElementFromArray } from '$util/utilities'
  import { generateSlug } from 'random-word-slugs'

  // Controls the spin animation of the instance regeneration button
  let rotationCounter: number = 0

  let email: string = ''
  let password: string = ''
  let instanceName: string = generateSlug(2)
  let formError: string = ''

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = email.length === 0 || password.length === 0 || instanceName.length === 0

  let isProcessing: boolean = false

  // Fun quotes when waiting for the instance to load. This could take up to 10 seconds
  let processingQuotesArray = [
    'Did you know it takes fourteen sentient robots to create each instance on PocketHost?'
  ]

  let processingQuote = getRandomElementFromArray(processingQuotesArray)

  const handleInstanceNameRegeneration = () => {
    rotationCounter = rotationCounter + 180
    instanceName = generateSlug(2)
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    isFormButtonDisabled = true
    isProcessing = true

    await handleInstanceGeneratorWidget(email, password, instanceName, (error) => {
      formError = error
    })

    isFormButtonDisabled = false

    isProcessing = false
  }
</script>

{#if isProcessing}
  <div class="d-flex align-items-center gap-3">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>

    <div>
      <h3 class="mb-1">Creating Your New Instance...</h3>

      <p class="small text-muted mb-0">{processingQuote}</p>
    </div>
  </div>
{:else}
  <h3 class="mb-3">Create Your Instance Now</h3>

  <form class="row align-items-center" on:submit={handleSubmit}>
    <div class="col-lg-6 col-12">
      <div class="form-floating mb-3 mb-lg-3">
        <input
          type="email"
          class="form-control"
          id="email"
          placeholder="name@example.com"
          autocomplete="email"
          bind:value={email}
          required
        />
        <label for="email">Email</label>
      </div>
    </div>

    <div class="col-lg-6 col-12">
      <div class="form-floating mb-3 mb-lg-3">
        <input
          type="password"
          class="form-control"
          id="password"
          placeholder="Password"
          autocomplete="new-password"
          bind:value={password}
          required
        />
        <label for="password">Password</label>
      </div>
    </div>

    <div class="col-lg-6 col-12">
      <div class="form-floating mb-3 mb-lg-3">
        <input
          type="text"
          class="form-control"
          id="instance"
          placeholder="Instance"
          bind:value={instanceName}
          required
        />
        <label for="instance">Instance Name</label>

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
    </div>

    <div class="col-lg-6 col-12">
      <div class="mb-3 mb-lg-3 text-lg-start text-center">
        <button type="submit" class="btn btn-primary" disabled={isFormButtonDisabled}>
          Create <i class="bi bi-arrow-right-short" />
        </button>
      </div>
    </div>

    {#if formError}
      <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
    {/if}
  </form>
{/if}

<style>
  form {
    max-width: 600px;
  }

  .row {
    --bs-gutter-x: 0.5rem;
  }

  .btn.btn-primary {
    --bs-btn-padding-y: 12px;
  }

  .regenerate-instance-name-btn {
    padding: 0;
    width: 40px;
    height: 40px;
    position: absolute;
    z-index: 500;
    top: 10px;
    right: 7px;
    transition: all 200ms;
  }
</style>
