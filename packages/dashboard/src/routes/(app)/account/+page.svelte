<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { PLAN_NAMES } from 'pockethost/common'
  import Avatar from '$src/routes/Navbar/Avatar.svelte'
  import { userStore, userSubscriptionType } from '$util/stores'
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
              <dd class="account-stat-value">{$userStore?.email}</dd>
            </div>
            <div class="account-stat">
              <dt>Plan</dt>
              <dd class="account-stat-value account-stat-value--plan">{PLAN_NAMES[$userSubscriptionType]}</dd>
            </div>
            <div class="account-stat account-stat--wide">
              <dt>Instances</dt>
              <dd>
                <span class="account-stat-value">{$userStore?.subscription_quantity}</span>
                <span class="account-stat-muted"> allowed</span>
                <span class="account-stat-sep">·</span>
                <a href="/support" class="account-stat-link">Request more</a>
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
              Manage membership
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</FeatureTab>
