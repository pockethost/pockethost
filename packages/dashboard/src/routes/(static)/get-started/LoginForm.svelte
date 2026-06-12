<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'

  const { authViaEmail } = client()

  export let isSignUpView: boolean = true

  let email: string = ''
  let password: string = ''
  let formError: string = ''
  let showPassword: boolean = false

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = email.length === 0 || password.length === 0

  let isButtonLoading: boolean = false

  const handleRegisterClick = () => {
    isSignUpView = !isSignUpView
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    isFormButtonDisabled = true
    isButtonLoading = true
    formError = ''
    showPassword = false
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

<form class="p-10 pb-5 flex flex-col gap-2" onsubmit={handleSubmit}>
  <h2 class="font-bold text-white mb-3 text-center text-2xl">Log In</h2>

  <div>
    <label class="block mb-1" for="email">
      <span>Email</span>
    </label>

    <wa-input
      type="email"
      id="email"
      placeholder="name@example.com"
      autocomplete="email"
      value={email}
      oninput={(e) => (email = e.currentTarget.value)}
      required
      class="w-full"
    ></wa-input>
  </div>

  <div class="mb-3 relative">
    <label class="block mb-1" for="password">
      <span>Password</span>
    </label>

    <div class="relative">
      <wa-input
        type={showPassword ? 'text' : 'password'}
        id="password"
        placeholder="Password"
        autocomplete="current-password"
        value={password}
        oninput={(e) => (password = e.currentTarget.value)}
        required
        class="w-full"
      ></wa-input>
      {#if password.length > 0}
        <button
          type="button"
          class="absolute inset-y-0 right-4 flex items-center text-gray-500"
          onclick={() => (showPassword = !showPassword)}
          tabindex="-1"
        >
          <wa-icon name={showPassword ? 'eye-slash' : 'eye'}></wa-icon>
        </button>
      {/if}
    </div>

    <div class="w-full text-end mt-1">
      <a href="login/password-reset" class="text-sm underline-offset-2 text-secondary text-primary">
        Forgot Password?
      </a>
    </div>
  </div>

  <AlertBar message={formError} type="error" />

  <div class="w-full">
    <wa-button type="submit" variant="brand" class="w-full" disabled={isFormButtonDisabled}>
      {#if isButtonLoading}
        <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
      {:else}
        Log In
        <wa-icon slot="end" name="arrow-right"></wa-icon>
      {/if}
    </wa-button>
  </div>
</form>
<wa-divider class="my-0 text-white"></wa-divider>

<div class="p-4 text-sm text-center">
  <div class="mb-2">
    Don't have an account?
    <button type="button" class="text-primary ml-1 dark:text-secondary" onclick={handleRegisterClick}>
      Create A New Account
    </button>
  </div>
</div>
