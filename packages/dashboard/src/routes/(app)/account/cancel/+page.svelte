<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { cancelLemonSqueezyMembership } from '$util/lemonsqueezy'
  import { SubscriptionInterval, SubscriptionType } from 'pockethost/common'
  import { userStore, userSubscriptionType } from '$util/stores'

  let isSubmitting = false
  let errorMessage = ''
  let cancelled = false
  let endsAt: string | null = null

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

    const confirmed = confirm(
      `Cancel your Pro membership? You keep access until the end of the current billing period. Your instances will stop running when the membership ends.`
    )
    if (!confirmed) return

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
      Cancel recurring billing for your Pro plan. You keep your current instance allowance until the billing period
      ends.
    </p>
  </svelte:fragment>

  {#if !canCancel}
    <wa-callout variant="neutral" open>
      <wa-icon slot="icon" name="circle-info"></wa-icon>
      This account does not have a cancellable Pro membership.
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
    <wa-card class="wa-card-danger">
      <div class="wa-card-body wa-card-body--lg wa-stack-lg">
        <ul class="space-y-2 text-sm text-white/80">
          <li>Billing stops at the end of the current period.</li>
          <li>Your instances will stop running when the membership ends.</li>
          <li>Need a refund? See our cancellation policy or contact support.</li>
        </ul>

        <div class="pt-2 border-t border-white/10">
          <form onsubmit={handleCancel}>
            <wa-button type="submit" variant="danger" disabled={isSubmitting}>
              <wa-icon slot="start" name="ban"></wa-icon>
              Cancel membership
            </wa-button>
          </form>
        </div>
      </div>
    </wa-card>
  {/if}
</FeatureTab>
