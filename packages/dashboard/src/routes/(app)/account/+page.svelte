<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import {
    DB_STORAGE_MB_PER_INSTANCE,
    FILE_STORAGE_GB_PER_INSTANCE,
    PLAN_NAMES,
    subscriptionStorageLimits,
    SubscriptionInterval,
    SubscriptionType,
  } from 'pockethost/common'
  import Avatar from '$src/routes/Navbar/Avatar.svelte'
  import { userStore, userSubscriptionType } from '$util/stores'
  import StorageMeter from './StorageMeter.svelte'

  $: canCancelMembership =
    $userSubscriptionType === SubscriptionType.Premium &&
    $userStore?.subscription_interval === SubscriptionInterval.Month

  $: instanceCount = $userStore?.subscription_quantity ?? 0
  $: storageLimits = subscriptionStorageLimits(instanceCount)
  $: perInstanceLabel = instanceCount === 1 ? 'PocketBase' : 'PocketBases'
  $: volumeUsedBytes = $userStore?.volume_storage_used ?? 0
  $: objectUsedBytes = $userStore?.object_storage_used ?? 0
  $: volumeSubline =
    instanceCount > 0
      ? `Pooled across instances · ${DB_STORAGE_MB_PER_INSTANCE} MB × ${instanceCount} ${perInstanceLabel}`
      : 'Upgrade to add storage'
  $: objectSubline =
    instanceCount > 0
      ? `Pooled across instances · ${FILE_STORAGE_GB_PER_INSTANCE} GB × ${instanceCount} ${perInstanceLabel}`
      : 'Upgrade to add storage'
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
                <span class="account-stat-sep">·</span>
                <a href="/support" class="account-stat-link">Request more</a>
              </dd>
            </div>
            <div class="account-stat account-stat--wide account-stat--meter">
              <dt>DB storage</dt>
              <dd>
                <StorageMeter
                  label="DB storage"
                  usedBytes={volumeUsedBytes}
                  limitBytes={storageLimits.volumeBytes}
                  subline={volumeSubline}
                />
              </dd>
            </div>
            <div class="account-stat account-stat--wide account-stat--meter">
              <dt>File storage</dt>
              <dd>
                <StorageMeter
                  label="File storage"
                  usedBytes={objectUsedBytes}
                  limitBytes={storageLimits.objectBytes}
                  subline={objectSubline}
                />
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
