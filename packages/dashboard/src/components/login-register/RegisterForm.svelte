<script lang="ts">
  import { slide } from 'svelte/transition'
  import { handleInstanceGeneratorWidget } from '$util/database'
  import { generateSlug } from 'random-word-slugs'

  export let isProcessing: boolean = false
  export let isSignUpView: boolean = false

  // Controls the spin animation of the instance regeneration button
  let rotationCounter: number = 0

  // Set up the variables to hold the form information
  let email: string = ''
  let password: string = ''
  let instanceName: string = generateSlug(2)
  let formError: string = ''

  // Disable the form button until all fields are filled out
  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled =
    email.length === 0 || password.length === 0 || instanceName.length === 0

  // Generate a unique name for the PocketHost instance
  const handleInstanceNameRegeneration = () => {
    rotationCounter = rotationCounter + 180
    instanceName = generateSlug(2)
  }

  // Toggle between registration and login forms
  const handleLoginClick = () => {
    isSignUpView = !isSignUpView
  }

  // Handle the form submission
  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    isFormButtonDisabled = true
    isProcessing = true

    /*await handleInstanceGeneratorWidget(
      email,
      password,
      instanceName,
      (error) => {
        formError = error
      },
    )*/

    setTimeout(() => {
      isFormButtonDisabled = false

      isProcessing = false
    }, 5000)
  }
</script>

<form class="card-body" on:submit={handleSubmit}>
  <h2 class="font-bold text-white mb-3 text-center text-2xl">
    Register and Create Your <br />First Instance
  </h2>

  <div class="mb-3">
    <label class="label" for="id">
      <span class="label-text">Email</span>
    </label>

    <input
      type="email"
      class="input input-bordered w-full"
      id="email"
      placeholder="name@example.com"
      autocomplete="email"
      bind:value={email}
      required
    />
  </div>

  <div class="mb-3">
    <label class="label" for="password">
      <span class="label-text">Password</span>
    </label>
    <input
      type="password"
      class="input input-bordered w-full"
      id="password"
      placeholder="Password"
      autocomplete="new-password"
      bind:value={password}
      required
    />
  </div>

  <div class="mb-12">
    <label class="label" for="instance">
      <span class="label-text">Instance Name</span>
    </label>

    <div class="input-group">
      <input
        type="text"
        placeholder="instance-name"
        bind:value={instanceName}
        id="instance"
        class="input input-bordered w-full"
      />

      <button
        type="button"
        class="btn btn-square"
        on:click={handleInstanceNameRegeneration}
      >
        <i class="fa-solid fa-rotate"></i>
      </button>
    </div>
  </div>

  {#if formError}
    <div transition:slide class="alert alert-error mb-5">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{formError}</span>
    </div>
  {/if}

  <div class="card-actions justify-end">
    <button
      type="submit"
      class="btn btn-primary"
      disabled={isFormButtonDisabled}
    >
      Create <i class="fa-solid fa-arrow-right"></i>
    </button>
  </div>
</form>

<div class="p-4 bg-zinc-800 text-center">
  Already have an account? <button
    type="button"
    class="link font-bold"
    on:click={handleLoginClick}>Login</button
  >
</div>
