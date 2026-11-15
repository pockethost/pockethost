<script lang="ts">
  import { signupAndCheckout } from '$util/database'
  import { planLabelForPvId } from '$util/checkoutIntent'

  export let isSignUpView: boolean = false
  /** Plan picked on /pricing. */
  export let checkoutPvId = ''

  $: planLabel = planLabelForPvId(checkoutPvId)

  let email = ''
  let password = ''
  let formError = ''
  let busy = false

  $: disabled = busy || email.length === 0 || password.length < 8

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (disabled) return
    busy = true
    formError = ''
    await signupAndCheckout(email.trim().toLowerCase(), password, checkoutPvId, (message) => {
      formError = message
    })
    busy = false
  }
</script>

<form class="auth-form" onsubmit={handleSubmit}>
  <h2 class="auth-form-title">Create your account</h2>
  <p class="auth-form-lead">Then pay, and create your first instance from your dashboard.</p>

  <div class="signup-plan">
    <span class="signup-plan-name">{planLabel}</span>
    <a href="/pricing" class="signup-plan-change">Change</a>
  </div>

  <div class="auth-field-group">
    <label class="auth-label" for="email">Email</label>
    <input
      type="email"
      id="email"
      name="email"
      class="auth-field"
      placeholder="name@example.com"
      autocomplete="email"
      bind:value={email}
      required
    />
  </div>

  <div class="auth-field-group">
    <label class="auth-label" for="password">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      class="auth-field"
      placeholder="At least 8 characters"
      autocomplete="new-password"
      minlength="8"
      bind:value={password}
      required
    />
  </div>

  {#if formError}
    <wa-callout variant="danger" class="wa-callout-padded">
      <wa-icon slot="icon" name="circle-xmark"></wa-icon>
      {formError}
    </wa-callout>
  {/if}

  <button type="submit" class="auth-submit" {disabled}>
    {#if busy}
      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
    {:else}
      Continue to payment
      <wa-icon name="arrow-right"></wa-icon>
    {/if}
  </button>
  <p class="signup-fine">30-day money-back guarantee. Secure checkout by Lemon Squeezy.</p>
</form>

<div class="auth-footer">
  Already have an account?
  <button type="button" class="auth-footer-button" onclick={() => (isSignUpView = !isSignUpView)}>Log in</button>
</div>

<style>
  .signup-plan {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid rgb(30 184 84 / 0.6);
    border-radius: 0.75rem;
    background: rgb(30 184 84 / 0.08);
  }

  .signup-plan-name {
    font-weight: 600;
    color: #fff;
  }

  .signup-plan-change {
    font-size: 0.85rem;
    color: rgb(30 184 84);
  }

  .signup-fine {
    margin: 0;
    text-align: center;
    font-size: 0.75rem;
    color: rgb(255 255 255 / 0.45);
  }
</style>
