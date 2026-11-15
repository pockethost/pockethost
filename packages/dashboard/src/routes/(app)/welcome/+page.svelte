<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore, userStore } from '$util/stores'
  import { instanceAllowance } from '@pockethost/server/common'
  import { onDestroy, onMount } from 'svelte'
  import Creator from '../instances/new/Creator.svelte'

  /** How long to wait for the payment webhook before saying so. */
  const WAIT_MS = 90_000

  $: allowance = instanceAllowance($userStore ?? {})
  $: instanceCount = Object.values($globalInstancesStore).length
  $: paid = allowance > 0

  let waitedTooLong = false
  let timer: ReturnType<typeof setInterval> | undefined
  const started = Date.now()

  onMount(() => {
    // The user record updates over realtime when the webhook lands; refresh too, in case realtime isn't up yet.
    timer = setInterval(() => {
      if (paid) return clearInterval(timer)
      if (Date.now() - started > WAIT_MS) {
        waitedTooLong = true
        return clearInterval(timer)
      }
      client().client.collection('users').authRefresh().catch(console.error)
    }, 4000)
  })
  onDestroy(() => clearInterval(timer))
</script>

<svelte:head>
  <title>Welcome - PocketHost</title>
</svelte:head>

<div class="welcome">
  {#if !paid}
    <div class="welcome-wait">
      {#if waitedTooLong}
        <h1 class="welcome-title">Your payment hasn't reached us yet</h1>
        <p class="welcome-lead">
          This usually takes a few seconds. If you paid, refresh this page in a minute. Still stuck? Reach us on
          <a href="/support">support</a> and we'll sort it out.
        </p>
        <wa-button href="/pricing" variant="neutral" appearance="outline">See plans</wa-button>
      {:else}
        <span class="welcome-spinner"></span>
        <h1 class="welcome-title">Confirming your payment</h1>
        <p class="welcome-lead">This takes a few seconds.</p>
      {/if}
    </div>
  {:else if instanceCount === 0}
    <h1 class="welcome-title">You're in. Name your first instance.</h1>
    <p class="welcome-lead">
      It becomes your PocketBase URL. You can rename it later, and your plan covers {allowance} instance{allowance === 1
        ? ''
        : 's'}.
    </p>
    <div class="welcome-creator"><Creator /></div>
  {:else}
    <h1 class="welcome-title">You're all set</h1>
    <p class="welcome-lead">Your plan covers {allowance} instance{allowance === 1 ? '' : 's'}.</p>
    <div class="welcome-actions">
      <wa-button href="/dashboard" variant="brand">Go to dashboard</wa-button>
      {#if instanceCount < allowance}
        <wa-button href="/instances/new" variant="neutral" appearance="outline">New instance</wa-button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .welcome {
    max-width: 32rem;
    margin: 0 auto;
    padding: 2rem 0 4rem;
    text-align: center;
  }

  .welcome-wait {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .welcome-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid rgb(255 255 255 / 0.3);
    border-top-color: #fff;
    border-radius: 999px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .welcome-title {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    color: #fff;
  }

  .welcome-lead {
    margin: 0.6rem 0 1.5rem;
    color: rgb(255 255 255 / 0.6);
  }

  .welcome-lead a {
    text-decoration: underline;
  }

  .welcome-creator {
    text-align: left;
  }

  .welcome-actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }
</style>
