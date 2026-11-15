<script lang="ts">
  import { globalInstancesStore, userStore } from '$util/stores'
  import PricingPlans from '$src/components/PricingPlans.svelte'
  import { instanceAllowance } from '@pockethost/server/common'
  import InstanceList from './InstanceList.svelte'
  import LoyaltyNudge from './LoyaltyNudge.svelte'
  import { page } from '$app/state'
  import { client } from '$src/pocketbase-client'
  import { onDestroy } from 'svelte'

  $: instanceCount = Object.values($globalInstancesStore).length
  $: canCreate = ($userStore?.subscription_quantity ?? 0) > 0
  $: allowance = instanceAllowance($userStore ?? {})
  /** Pay first: a new account with no plan and no instances picks a plan here. */
  $: needsPlan = allowance === 0 && instanceCount === 0

  /** Just back from checkout (?paid=1): wait for the payment webhook instead of showing plans again. */
  const WAIT_MS = 90_000
  const justPaid = page.url.searchParams.get('paid') === '1'
  let waitedTooLong = false
  const started = Date.now()
  const timer = justPaid
    ? setInterval(() => {
        if (allowance > 0) return clearInterval(timer)
        if (Date.now() - started > WAIT_MS) {
          waitedTooLong = true
          return clearInterval(timer)
        }
        // The user record also updates over realtime; this covers realtime not being connected yet.
        client().client.collection('users').authRefresh().catch(console.error)
      }, 4000)
    : undefined
  onDestroy(() => clearInterval(timer))
  $: confirming = justPaid && needsPlan && !waitedTooLong
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<header class="dashboard-head">
  <div>
    <h1 class="dashboard-title">Dashboard</h1>
    <p class="dashboard-subtitle">
      {#if confirming}
        Confirming your payment. This takes a few seconds.
      {:else if justPaid && needsPlan}
        Your payment hasn't reached us yet. If you paid, refresh in a minute, or reach us on
        <a href="/support" class="underline">support</a>.
      {:else if needsPlan}
        Pick a plan to create your first PocketBase instance. Every plan has a 30-day money-back guarantee.
      {:else if instanceCount === 0}
        Create a PocketBase instance to get started.
      {:else}
        {instanceCount} instance{instanceCount === 1 ? '' : 's'}. Plans will be limited by storage, not instance count.
      {/if}
    </p>
  </div>

  {#if canCreate}
    <wa-button href="/instances/new" variant="brand" class="dashboard-new-btn">
      <wa-icon slot="start" name="plus"></wa-icon>
      New instance
    </wa-button>
  {/if}
</header>

<LoyaltyNudge />

{#if confirming}
  <div class="dashboard-confirming"><span class="dashboard-spinner"></span></div>
{:else if needsPlan}
  <PricingPlans />
{:else}
  <InstanceList />
{/if}

<style>
  .dashboard-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.75rem;
  }

  .dashboard-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
  }

  @media (min-width: 768px) {
    .dashboard-title {
      font-size: 1.875rem;
    }
  }

  .dashboard-subtitle {
    margin: 0.35rem 0 0;
    max-width: 36rem;
    font-size: 0.875rem;
    line-height: 1.45;
    color: rgb(255 255 255 / 0.45);
  }

  .dashboard-confirming {
    display: flex;
    justify-content: center;
    padding: 3rem 0;
  }

  .dashboard-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid rgb(255 255 255 / 0.3);
    border-top-color: #fff;
    border-radius: 999px;
    animation: dashboard-spin 0.8s linear infinite;
  }

  @keyframes dashboard-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .dashboard-new-btn {
    flex-shrink: 0;
  }
</style>
