<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'

  const { authViaEmail } = client()

  export let isSignUpView: boolean = true

  let email: string = ''
  let password: string = ''
  let formError: string = ''
  let showPassword: boolean = false

  $: isFormButtonDisabled = email.length === 0 || password.length === 0

  let isButtonLoading: boolean = false

  const handleRegisterClick = () => {
    isSignUpView = !isSignUpView
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (!email || !password) return

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
    isButtonLoading = false
  }
</script>

<form class="p-10 pb-5 flex flex-col gap-2" method="post" autocomplete="on" onsubmit={handleSubmit}>
  <h2 class="font-bold text-white mb-3 text-center text-2xl">Log In</h2>

  <div>
    <label class="auth-label" for="email">Email</label>
    <input
      type="email"
      id="email"
      name="email"
      class="auth-field"
      placeholder="name@example.com"
      autocomplete="username"
      bind:value={email}
      required
    />
  </div>

  <div class="mb-3">
    <label class="auth-label" for="password">Password</label>
    <div class="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        id="password"
        name="password"
        class="auth-field pr-10"
        placeholder="Password"
        autocomplete="current-password"
        bind:value={password}
        required
      />
      {#if password.length > 0}
        <button
          type="button"
          class="absolute inset-y-0 right-3 flex items-center text-gray-500"
          onclick={() => (showPassword = !showPassword)}
          tabindex="-1"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
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

<style>
  .auth-label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(255 255 255 / 0.9);
  }

  .auth-field {
    width: 100%;
    height: 2.5rem;
    padding: 0 0.75rem;
    border-radius: var(--wa-border-radius-m, 0.375rem);
    border: 1px solid rgb(255 255 255 / 0.15);
    background-color: rgb(17 17 17 / 0.7);
    color: #fff;
    font-size: 1rem;
    line-height: 1.5;
  }

  .auth-field::placeholder {
    color: rgb(255 255 255 / 0.4);
  }

  .auth-field:focus {
    outline: none;
    border-color: var(--wa-color-focus, #3b82f6);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--wa-color-focus, #3b82f6) 40%, transparent);
  }
</style>
