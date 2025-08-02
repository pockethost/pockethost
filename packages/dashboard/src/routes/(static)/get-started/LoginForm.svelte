<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'
  import Fa from 'svelte-fa'
  import { faArrowRight } from '@fortawesome/free-solid-svg-icons'

  const { authViaEmail } = client()

  export let isSignUpView: boolean = true

  // Set up the variables to hold the form information
  let email: string = ''
  let password: string = ''
  let formError: string = ''

  // Disable the form button until all fields are filled out
  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = email.length === 0 || password.length === 0

  let isButtonLoading: boolean = false

  // Toggle between registration and login forms
  const handleRegisterClick = () => {
    isSignUpView = !isSignUpView
  }

  // Handle the form submission
  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    isFormButtonDisabled = true
    isButtonLoading = true
    formError = ''

    try {
      await authViaEmail(email, password)
      window.location.href = '/dashboard'
    } catch (error) {
      const e = error as Error
      formError = `Something went wrong with logging you in. ${e.message}`
    }
    isFormButtonDisabled = false
    isButtonLoading = false
  }
</script>

<form class="p-10 pb-5  flex flex-col gap-2" on:submit={handleSubmit}>
  <h2 class="font-bold text-white mb-3 text-center text-2xl">Log In</h2>

  <div class="">
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
      autocomplete="current-password"
      bind:value={password}
      required
    />
    <div class="w-full text-end mt-1">
      <a href="login/password-reset" class="link text-sm underline-offset-2 text-secondary">Forgot Password?</a>
    </div>
  </div>

  <AlertBar message={formError} type="error" />

  <div class="w-full">
    <button type="submit" class="btn bg-primary hover:bg-light w-full" disabled={isFormButtonDisabled}>
      {#if isButtonLoading}
        <span class="loading loading-spinner"></span>
      {:else}
        Log In <Fa icon={faArrowRight} />
      {/if}
    </button>
  </div>
</form>
<div class="divider my-0 text-white"></div>


<div class="p-4 text-sm text-center">
  <div class="mb-2">
    Don't have an account? <button type="button" class="link text-primary ml-1 dark:text-secondary" on:click={handleRegisterClick}
      >Create A New Account</button
    >
  </div>
</div>
