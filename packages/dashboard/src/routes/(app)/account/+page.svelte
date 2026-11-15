<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import {
    allowanceParts,
    DISK_STORAGE_GB_PER_PAID_INSTANCE,
    diskStorageLimit,
    PLAN_NAMES,
    SubscriptionInterval,
    SubscriptionType,
  } from '@pockethost/server/common'
  import Avatar from '$src/routes/Navbar/Avatar.svelte'
  import { userStore, userSubscriptionType } from '$util/stores'
  import StorageMeter from './StorageMeter.svelte'
  import { client } from '$src/pocketbase-client'
  import { onMount } from 'svelte'
  import { formatBonusDate, loadLoyaltyStatus, type LoyaltyStatus } from '$util/loyalty'
  import { LOYALTY_MAX_BONUS } from '@pockethost/server/common'

  type BonusGrant = { id: string; amount: number; source: 'manual' | 'loyalty'; note: string; created: string }
  let bonusGrants: BonusGrant[] = []
  onMount(async () => {
    try {
      bonusGrants = await client().client.collection('bonus_grants').getFullList<BonusGrant>({ sort: '-created' })
    } catch {
      bonusGrants = [] // collection not deployed yet, or no access
    }
  })

  let loyalty: LoyaltyStatus | null = null
  let loyaltyFor = ''
  $: loyaltyKey = $userStore?.id ? `${$userStore.id}:${$userStore.subscription_quantity ?? 0}` : ''
  $: if (loyaltyKey && loyaltyKey !== loyaltyFor) {
    loyaltyFor = loyaltyKey
    loadLoyaltyStatus($userStore?.subscription_quantity ?? 0).then((s) => (loyalty = s))
  }
  /** Bonus instances held now (granted), and what the next step is. */
  $: bonusNow = Math.max(0, Math.floor($userStore?.bonus_instances ?? 0))
  $: bonusNext = !loyalty
    ? ''
    : loyalty.result.basis === 'excluded'
      ? `Bonus instances are for accounts with up to ${LOYALTY_MAX_BONUS} paid instances`
      : loyalty.progress
        ? `Next one in ${loyalty.progress.days} day${loyalty.progress.days === 1 ? '' : 's'} (${formatBonusDate(loyalty.progress.date)})`
        : bonusNow >= LOYALTY_MAX_BONUS
          ? `You're at the max`
          : allowance.paid > 0
            ? ''
            : `Subscribe to start earning them`

  $: canCancelMembership =
    $userSubscriptionType === SubscriptionType.Premium &&
    $userStore?.subscription_interval === SubscriptionInterval.Month

  $: allowance = allowanceParts($userStore ?? {})
  $: instanceCount = allowance.total
  $: paidInstances = $userSubscriptionType === SubscriptionType.Premium ? allowance.paid : 0
  $: bonusTooltip = bonusGrants
    .filter((g) => g.amount !== 0)
    .map((g) => `${g.amount > 0 ? '+' : ''}${g.amount}${g.note ? `: ${g.note}` : ''}`)
    .join('\n')
  $: diskLimit = diskStorageLimit($userSubscriptionType, paidInstances)
  // Everything on PocketHost's servers counts toward one pooled number.
  $: diskUsedBytes = ($userStore?.volume_storage_used ?? 0) + ($userStore?.object_storage_used ?? 0)
  $: diskSubline =
    diskLimit.basis === 'legacy'
      ? `Pooled across instances · flat ${diskLimit.gb} GB for ${PLAN_NAMES[$userSubscriptionType]} plans`
      : diskLimit.basis === 'per-instance'
        ? `Pooled across instances · ${DISK_STORAGE_GB_PER_PAID_INSTANCE} GB × ${paidInstances} paid ${paidInstances === 1 ? 'instance' : 'instances'}`
        : `${diskLimit.gb} GB without paid instances · each paid instance adds ${DISK_STORAGE_GB_PER_PAID_INSTANCE} GB`
</script>

<svelte:head>
  <title>Account - PocketHost</title>
</svelte:head>

<FeatureTab title="Account">
  <div class="account-card">
    <div class="account-card-body">
      <div class="account-profile-row">
        <div class="account-profile">
          <Avatar size={80} class="account-avatar" />
          <a
            href="https://gravatar.com/profile"
            target="_blank"
            rel="noopener noreferrer"
            class="account-btn account-btn--outline"
          >
            <wa-icon name="image"></wa-icon>
            Gravatar
          </a>
        </div>

        <div class="account-details">
          <dl class="account-stats-grid">
            <div class="account-stat">
              <dt>Email</dt>
              <dd>
                <span class="account-stat-value">{$userStore?.email}</span>
                <span class="account-stat-sep">·</span>
                <a href="/account/change-email" class="account-stat-link">Change email</a>
              </dd>
            </div>
            <div class="account-stat">
              <dt>Plan</dt>
              <dd class="account-stat-value account-stat-value--plan">{PLAN_NAMES[$userSubscriptionType]}</dd>
            </div>
            <div class="account-stat account-stat--wide">
              <dt>Instances</dt>
              <dd>
                <span class="account-stat-value">{instanceCount}</span>
                <span class="account-stat-muted"> allowed</span>
                {#if allowance.bonus > 0}
                  <span class="account-stat-muted">({allowance.paid} paid + {allowance.bonus} bonus)</span>
                  <wa-badge id="bonus-instances-badge" variant="success" pill title={bonusTooltip}>
                    <wa-icon name="gift"></wa-icon>
                    +{allowance.bonus} bonus
                  </wa-badge>
                  {#if bonusTooltip}
                    <wa-tooltip for="bonus-instances-badge">
                      <span class="bonus-tooltip">{bonusTooltip}</span>
                    </wa-tooltip>
                  {/if}
                {/if}
                <span class="account-stat-sep">·</span>
                <a href="/support" class="account-stat-link">Request more</a>
              </dd>
            </div>
            <div class="account-stat account-stat--wide">
              <dt>Bonus instances</dt>
              <dd>
                <span class="account-stat-value">{bonusNow}</span>
                <span class="account-stat-muted"> of {LOYALTY_MAX_BONUS}</span>
                {#if bonusNext}
                  <span class="account-stat-sep">·</span>
                  <span class="account-stat-muted">{bonusNext}</span>
                {/if}
                <span class="account-stat-sep">·</span>
                <a href="/blog/loyalty-bonus-instances" class="account-stat-link">How it works</a>
              </dd>
            </div>
            <div class="account-stat account-stat--wide account-stat--meter">
              <dt>Disk storage</dt>
              <dd>
                <StorageMeter
                  label="Disk storage"
                  usedBytes={diskUsedBytes}
                  limitBytes={diskLimit.bytes}
                  subline={diskSubline}
                />
                <a href="/docs/limits#disk-storage" class="account-stat-link">What counts</a>
              </dd>
            </div>
          </dl>

          <div class="account-actions">
            <a
              href="https://store.pockethost.io/billing"
              target="_blank"
              rel="noopener noreferrer"
              class="account-btn account-btn--brand-outline"
            >
              <wa-icon name="credit-card"></wa-icon>
              Update payment method
            </a>
            {#if canCancelMembership}
              <a href="/account/cancel" class="account-btn account-btn--outline">
                <wa-icon name="ban"></wa-icon>
                Cancel membership
              </a>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</FeatureTab>

<style>
  .bonus-tooltip {
    white-space: pre-line;
  }
</style>
