<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { continueCheckoutAfterAuth } from '$util/database'
  import { planLabelForPvId } from '$util/checkoutIntent'

  const { authViaEmail } = client()

  export let isSignUpView: boolean = true
  export let checkoutPvId = ''

  let email: string = ''
  let password: string = ''
  let formError: string = ''
  let showPassword: boolean = false

  $: isFormButtonDisabled = email.length === 0 || password.length === 0
  $: planLabel = checkoutPvId ? planLabelForPvId(checkoutPvId) : ''
  $: submitLabel = checkoutPvId ? 'Log in & subscribe' : 'Log In'

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
      if (checkoutPvId) {
        await continueCheckoutAfterAuth(checkoutPvId, (message) => {
          formError = message
        })
        return
      }
      window.location.href = '/dashboard'
    } catch (error) {
      const e = error as Error
      formError = `Something went wrong with logging you in. ${e.message}`
    }
    isButtonLoading = false
  }
</script>

<form class="auth-form" method="post" autocomplete="on" onsubmit={handleSubmit}>
  <h2 class="auth-form-title">Log In</h2>

  {#if checkoutPvId}
    <p class="auth-form-lead">
      Log in to continue checkout for <strong>{planLabel}</strong>.
    </p>
  {/if}

  <div class="auth-field-group">
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

  <div class="auth-field-group">
    <label class="auth-label" for="password">Password</label>
    <div class="auth-field-wrap">
      <input
        type={showPassword ? 'text' : 'password'}
        id="password"
        name="password"
        class="auth-field auth-field--password"
        placeholder="Password"
        autocomplete="current-password"
        bind:value={password}
        required
      />
      {#if password.length > 0}
        <button
          type="button"
          class="auth-field-toggle"
          onclick={() => (showPassword = !showPassword)}
          tabindex="-1"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <wa-icon name={showPassword ? 'eye-slash' : 'eye'}></wa-icon>
        </button>
      {/if}
    </div>

    <div class="auth-link-row">
      <a href="/login/password-reset" class="auth-link">Forgot Password?</a>
    </div>
  </div>

  {#if formError}
    <wa-callout variant="danger" class="wa-callout-padded">
      <wa-icon slot="icon" name="circle-xmark"></wa-icon>
      {formError}
    </wa-callout>
  {/if}

  <button type="submit" class="auth-submit" disabled={isFormButtonDisabled || isButtonLoading}>
    {#if isButtonLoading}
      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
    {:else}
      {submitLabel}
      <wa-icon name="arrow-right"></wa-icon>
    {/if}
  </button>
</form>

<div class="auth-footer">
  Don't have an account?
  <button type="button" class="auth-footer-button" onclick={handleRegisterClick}>Create A New Account</button>
</div>
