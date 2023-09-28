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
  $: isFormButtonDisabled =
    email.length === 0 || password.length === 0 || instanceName.length === 0

  let isProcessing: boolean = false

  // Fun quotes when waiting for the instance to load. This could take up to 10 seconds
  let processingQuotesArray = [
    'Did you know it takes fourteen sentient robots to create each instance on PocketHost?',
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

    await handleInstanceGeneratorWidget(
      email,
      password,
      instanceName,
      (error) => {
        formError = error
      },
    )

    isFormButtonDisabled = false

    isProcessing = false
  }
</script>

<div class="card w-96 bg-base-100 shadow-xl">
  <div class="card-body">
    {#if isProcessing}
      <div class="d-flex align-items-center gap-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>

        <div>
          <h2>Creating Your New Instance...</h2>

          <p class="small text-muted mb-0">{processingQuote}</p>
        </div>
      </div>
    {:else}
      <h2 class="card-title m-3">Create Your First Instance Now</h2>

      <form class="row align-items-center" on:submit={handleSubmit}>
        <div class="col-lg-6 col-12">
          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              type="email"
              class="input input-bordered w-full max-w-xs"
              id="email"
              placeholder="name@example.com"
              autocomplete="email"
              bind:value={email}
              required
            />
          </div>
        </div>

        <div class="col-lg-6 col-12">
          <div class="form-floating mb-3 mb-lg-3">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <input
              type="password"
              class="input input-bordered w-full max-w-xs"
              id="password"
              placeholder="Password"
              autocomplete="new-password"
              bind:value={password}
              required
            />
          </div>
        </div>

        <div class="col-lg-6 col-12">
          <div class="form-floating mb-3 mb-lg-3">
            <label class="label">
              <span class="label-text">Instance Name</span>
            </label>
            <input
              type="text"
              class="input input-bordered w-full max-w-xs"
              id="instance"
              placeholder="Instance"
              bind:value={instanceName}
              required
            />

            <button
              aria-label="Regenerate Instance Name"
              type="button"
              style="transform: rotate({rotationCounter}deg);"
              class="m-3 btn btn-light rounded-circle regenerate-instance-name-btn"
              on:click={handleInstanceNameRegeneration}
            >
              regenerate
            </button>
          </div>
        </div>

        <div class="card-actions justify-end">
          <button
            type="submit"
            class="btn btn-primary"
            disabled={isFormButtonDisabled}
          >
            Create <i class="bi bi-arrow-right-short" />
          </button>
        </div>

        {#if formError}
          <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
        {/if}
      </form>
    {/if}
  </div>
</div>
