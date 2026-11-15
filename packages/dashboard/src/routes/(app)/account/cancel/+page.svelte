<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { cancelMembership as cancelLemonSqueezyMembership } from '$util/billing'
  import { SubscriptionInterval, SubscriptionType } from '@pockethost/server/common'
  import { userStore, userSubscriptionType } from '$util/stores'
  import { formatBonusDate, loadLoyaltyStatus, type LoyaltyStatus } from '$util/loyalty'

  let isSubmitting = false
  let errorMessage = ''
  let cancelled = false
  let endsAt: string | null = null

  let loyalty: LoyaltyStatus | null = null
  $: if ($userStore?.id && !loyalty) {
    loadLoyaltyStatus($userStore.subscription_quantity ?? 0).then((s) => (loyalty = s))
  }
  $: bonusNow = Math.max(0, Math.floor($userStore?.bonus_instances ?? 0))
  $: next = loyalty?.progress ?? null

  $: canCancel =
    $userSubscriptionType === SubscriptionType.Premium &&
    $userStore?.subscription_interval === SubscriptionInterval.Month

  const formatEndsAt = (value: string | null) => {
    if (!value) return null
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleCancel = async (e: Event) => {
    e.preventDefault()
    if (!canCancel || isSubmitting) return

    isSubmitting = true
    errorMessage = ''

    try {
      const result = await cancelLemonSqueezyMembership()
      endsAt = result.endsAt
      cancelled = true
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : `Could not cancel membership`
    } finally {
      isSubmitting = false
    }
  }
</script>

<svelte:head>
  <title>Cancel Membership - PocketHost</title>
</svelte:head>

<FeatureTab title="Cancel membership" {errorMessage}>
  <svelte:fragment slot="summary">
    <p class="text-sm text-white/70 leading-relaxed">
      Cancel recurring billing for Pay Per PocketBase. You keep your current instances until the billing period ends.
    </p>
  </svelte:fragment>

  {#if !canCancel}
    <wa-callout variant="neutral" open>
      <wa-icon slot="icon" name="circle-info"></wa-icon>
      This account does not have a cancellable Pay Per PocketBase subscription.
      <a href="/account" class="account-stat-link">Back to account</a>
    </wa-callout>
  {:else if cancelled}
    <wa-callout variant="success" open>
      <wa-icon slot="icon" name="circle-check"></wa-icon>
      Membership cancelled.
      {#if formatEndsAt(endsAt)}
        Access continues until {formatEndsAt(endsAt)}.
      {/if}
      <p class="mt-3">
        <a href="/account" class="account-stat-link">Back to account</a>
      </p>
    </wa-callout>
  {:else}
    <wa-card>
      <div class="wa-card-body wa-card-body--lg wa-stack-lg">
        <h2 class="cancel-why-title">Before you go</h2>

        {#if next}
          <div class="cancel-why-next">
            <wa-icon name="gift"></wa-icon>
            <span>
              Your {next.first ? 'first' : 'next'} bonus instance arrives on
              <strong>{formatBonusDate(next.date)}</strong>,
              {next.days} day{next.days === 1 ? '' : 's'} from now.
            </span>
          </div>
        {/if}

        <ul class="space-y-2 text-sm text-white/80">
          {#if next}
            <li>If you cancel, you won't get that bonus instance.</li>
          {/if}
          {#if bonusNow > 0}
            <li>
              You have {bonusNow} bonus instance{bonusNow === 1 ? '' : 's'}. They go away when your subscription ends.
            </li>
          {/if}
          <li>If your subscription lapses, the bonus clock resets and a new subscription starts from zero.</li>
          <li>Billing stops at the end of the current period, and your instances stop running then.</li>
          <li>Need a refund? See our cancellation policy or contact support.</li>
        </ul>

        <div class="cancel-why-actions">
          <wa-button href="/account" variant="brand">
            <wa-icon slot="start" name="heart"></wa-icon>
            Keep my subscription
          </wa-button>
          <form onsubmit={handleCancel}>
            <wa-button type="submit" variant="danger" appearance="outlined" disabled={isSubmitting}>
              {isSubmitting ? 'Cancelling…' : 'Cancel anyway'}
            </wa-button>
          </form>
        </div>
        <a href="/blog/loyalty-bonus-instances" class="account-stat-link text-sm">How bonus instances work</a>
      </div>
    </wa-card>
  {/if}
</FeatureTab>

<style>
  .cancel-why-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }

  .cancel-why-next {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1rem;
    border: 1px solid rgb(30 184 84 / 0.35);
    border-radius: 0.75rem;
    background: rgb(30 184 84 / 0.08);
    color: rgb(255 255 255 / 0.9);
  }

  .cancel-why-next wa-icon {
    flex-shrink: 0;
    color: rgb(30 184 84);
  }

  .cancel-why-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
</style>
