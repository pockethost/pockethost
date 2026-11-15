<script lang="ts">
  import { signupAndCheckout } from '$util/database'
  import { INSTANCE_ANNUAL_PV_ID, INSTANCE_LIFETIME_PV_ID, INSTANCE_MONTHLY_PV_ID } from '$util/billing'

  export let isSignUpView: boolean = false
  /** Plan picked on the pricing cards, if any. Defaults to Annual. */
  export let checkoutPvId = ''

  const plans = [
    { pvId: INSTANCE_MONTHLY_PV_ID, name: 'Monthly', price: '$9.99', per: 'per instance / month' },
    { pvId: INSTANCE_ANNUAL_PV_ID, name: 'Annual', price: '$59.99', per: 'per instance / year', note: 'Save 50%' },
    { pvId: INSTANCE_LIFETIME_PV_ID, name: 'Lifetime', price: '$149.99', per: 'once, per instance' },
  ]

  let pvId = INSTANCE_ANNUAL_PV_ID
  $: if (checkoutPvId) pvId = checkoutPvId

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
    await signupAndCheckout(email.trim().toLowerCase(), password, pvId, (message) => {
      formError = message
    })
    busy = false
  }
</script>

<form class="auth-form" onsubmit={handleSubmit}>
  <h2 class="auth-form-title">Create your account</h2>
  <p class="auth-form-lead">Pick a plan and pay. Then you name your first instance, and it's live in seconds.</p>

  <fieldset class="signup-plans">
    <legend class="auth-label">Plan</legend>
    {#each plans as plan}
      <label class="signup-plan" class:signup-plan--on={pvId === plan.pvId}>
        <input type="radio" name="plan" value={plan.pvId} bind:group={pvId} />
        <span class="signup-plan-name">
          {plan.name}
          {#if plan.note}<span class="signup-plan-note">{plan.note}</span>{/if}
        </span>
        <span class="signup-plan-price">{plan.price}</span>
        <span class="signup-plan-per">{plan.per}</span>
      </label>
    {/each}
  </fieldset>

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
  .signup-plans {
    display: grid;
    gap: 0.5rem;
    border: 0;
    margin: 0;
    padding: 0;
  }

  .signup-plan {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'radio name price' 'radio name per';
    column-gap: 0.75rem;
    align-items: center;
    padding: 0.7rem 0.9rem;
    border: 1px solid rgb(255 255 255 / 0.12);
    border-radius: 0.75rem;
    background: rgb(255 255 255 / 0.03);
    cursor: pointer;
    transition:
      border-color 150ms ease,
      background-color 150ms ease;
  }

  .signup-plan--on {
    border-color: rgb(30 184 84 / 0.8);
    background: rgb(30 184 84 / 0.08);
  }

  .signup-plan input {
    grid-area: radio;
    accent-color: rgb(30 184 84);
  }

  .signup-plan-name {
    grid-area: name;
    font-weight: 600;
    color: #fff;
  }

  .signup-plan-note {
    margin-left: 0.4rem;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
    color: rgb(30 184 84);
    background: rgb(30 184 84 / 0.12);
  }

  .signup-plan-price {
    grid-area: price;
    text-align: right;
    font-weight: 600;
    color: #fff;
  }

  .signup-plan-per {
    grid-area: per;
    text-align: right;
    font-size: 0.75rem;
    color: rgb(255 255 255 / 0.5);
  }

  .signup-fine {
    margin: 0;
    text-align: center;
    font-size: 0.75rem;
    color: rgb(255 255 255 / 0.45);
  }
</style>
