<script lang="ts">
  import { goto } from '$app/navigation'
  import { client } from '$src/pocketbase-client'
  import { AFTER_CHECKOUT_PATH, forgetClaim, savedClaim } from '$util/billing'
  import { ClientResponseError } from '@pockethost/server/common'
  import { onDestroy, onMount } from 'svelte'

  /**
   * Pay-first account claim. After a guest checkout the payment created an account under the billing email. Here the
   * buyer picks their account email and a password, or adds the purchase to an account they already have. The token is
   * the browser's (from checkout) or `?t=` from the emailed link.
   */
  type Status = { state: 'pending' } | { state: 'open'; email: string } | { state: 'claimed'; email: string }

  const WAIT_MS = 90_000
  const POLL_MS = 3000

  let token: { claim?: string; t?: string } = {}
  let status: Status | undefined
  let noToken = false
  let waitedTooLong = false
  let timer: ReturnType<typeof setTimeout> | undefined

  let mode: 'new' | 'existing' = 'new'
  let email = ''
  let password = ''
  let busy = false
  let formError = ''

  const pb = () => client().client

  const errMessage = (err: unknown) =>
    err instanceof ClientResponseError
      ? err.response?.message || err.message
      : err instanceof Error
        ? err.message
        : `${err}`

  const poll = async (started: number) => {
    try {
      status = await pb().send<Status>(`/api/claim/status`, { method: 'POST', body: token })
    } catch (err) {
      formError = errMessage(err)
      return
    }
    if (status.state === 'open' && !email) email = status.email
    if (status.state !== 'pending') return
    if (Date.now() - started > WAIT_MS) {
      waitedTooLong = true
      return
    }
    timer = setTimeout(() => poll(started), POLL_MS)
  }

  onMount(() => {
    const t = new URLSearchParams(window.location.search).get('t') || ''
    const claim = savedClaim()
    token = t ? { t } : claim ? { claim } : {}
    if (!token.t && !token.claim) {
      noToken = true
      return
    }
    poll(Date.now())
  })
  onDestroy(() => clearTimeout(timer))

  const done = async () => {
    forgetClaim()
    await goto(AFTER_CHECKOUT_PATH)
  }

  const submitNew = async (e: SubmitEvent) => {
    e.preventDefault()
    busy = true
    formError = ''
    try {
      const res = await pb().send<{ token: string; record: any }>(`/api/claim/complete`, {
        method: 'POST',
        body: { ...token, email: email.trim(), password },
      })
      pb().authStore.save(res.token, res.record)
      await done()
    } catch (err) {
      formError = errMessage(err)
    }
    busy = false
  }

  const submitExisting = async (e: SubmitEvent) => {
    e.preventDefault()
    busy = true
    formError = ''
    try {
      await client().authViaEmail(email.trim(), password)
      await pb().send(`/api/claim/attach`, { method: 'POST', body: token })
      await done()
    } catch (err) {
      formError = errMessage(err)
    }
    busy = false
  }

  const switchMode = (m: 'new' | 'existing') => {
    mode = m
    formError = ''
    password = ''
    email = m === 'new' && status?.state === 'open' ? status.email : ''
  }
</script>

<svelte:head>
  <title>Set up your account - PocketHost</title>
</svelte:head>

<div class="w-full flex items-center justify-center px-4 md:px-16 py-10 md:py-16">
  <div class="auth-card w-full max-w-md">
    {#if noToken}
      <div class="auth-form">
        <h2 class="auth-form-title">Nothing to set up here</h2>
        <p class="auth-form-lead">
          If you just paid, open the link in the email we sent to your billing address. Already set up?
        </p>
        <a href="/login" class="auth-submit">Log in</a>
      </div>
    {:else if !status || status.state === 'pending'}
      <div class="auth-form claim-wait">
        {#if waitedTooLong}
          <h2 class="auth-form-title">Your payment hasn't reached us yet</h2>
          <p class="auth-form-lead">
            This usually takes a few seconds. We'll also email your billing address a link to set up your account. Still
            stuck? Reach us on <a href="/support" class="underline">support</a>.
          </p>
        {:else}
          <span class="claim-spinner"></span>
          <h2 class="auth-form-title">Confirming your payment</h2>
          <p class="auth-form-lead">This takes a few seconds.</p>
        {/if}
        {#if formError}<p class="claim-error">{formError}</p>{/if}
      </div>
    {:else if status.state === 'claimed'}
      <div class="auth-form">
        <h2 class="auth-form-title">You're all set</h2>
        <p class="auth-form-lead">
          This purchase is on the PocketHost account for <strong>{status.email}</strong>. Log in to create your
          instances.
        </p>
        <a href="/login" class="auth-submit" onclick={forgetClaim}>Log in</a>
      </div>
    {:else if mode === 'new'}
      <form class="auth-form" onsubmit={submitNew}>
        <h2 class="auth-form-title">Payment received. Set up your account.</h2>
        <p class="auth-form-lead">
          We filled in the email you paid with. Change it if you'd rather sign in with a different one.
        </p>

        <div class="auth-field-group">
          <label class="auth-label" for="email">Your PocketHost email</label>
          <input type="email" id="email" class="auth-field" autocomplete="email" bind:value={email} required />
        </div>
        <div class="auth-field-group">
          <label class="auth-label" for="password">Password</label>
          <input
            type="password"
            id="password"
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

        <button type="submit" class="auth-submit" disabled={busy || !email || password.length < 8}>
          {busy ? 'Setting up…' : 'Create my account'}
          {#if !busy}<wa-icon name="arrow-right"></wa-icon>{/if}
        </button>
      </form>
      <div class="auth-footer">
        Already have a PocketHost account?
        <button type="button" class="auth-footer-button" onclick={() => switchMode('existing')}>
          Add this purchase to it
        </button>
      </div>
    {:else}
      <form class="auth-form" onsubmit={submitExisting}>
        <h2 class="auth-form-title">Add this purchase to your account</h2>
        <p class="auth-form-lead">Log in to the PocketHost account you already have.</p>

        <div class="auth-field-group">
          <label class="auth-label" for="login-email">Email</label>
          <input type="email" id="login-email" class="auth-field" autocomplete="username" bind:value={email} required />
        </div>
        <div class="auth-field-group">
          <label class="auth-label" for="login-password">Password</label>
          <input
            type="password"
            id="login-password"
            class="auth-field"
            autocomplete="current-password"
            bind:value={password}
            required
          />
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

        <button type="submit" class="auth-submit" disabled={busy || !email || !password}>
          {busy ? 'Adding…' : 'Log in and add it'}
          {#if !busy}<wa-icon name="arrow-right"></wa-icon>{/if}
        </button>
      </form>
      <div class="auth-footer">
        New to PocketHost?
        <button type="button" class="auth-footer-button" onclick={() => switchMode('new')}>
          Set up a new account instead
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .claim-wait {
    align-items: center;
    text-align: center;
  }

  .claim-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid rgb(255 255 255 / 0.3);
    border-top-color: #fff;
    border-radius: 999px;
    animation: claim-spin 0.8s linear infinite;
  }

  @keyframes claim-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .claim-error {
    margin: 0;
    font-size: 0.85rem;
    color: rgb(248 113 113);
  }
</style>
