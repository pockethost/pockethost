<script lang="ts">
  import { userSubscriptionType } from '$util/stores'
  import { PLAN_NAMES } from 'pockethost/common'
  import { userStore } from '$util/stores'
  import Avatar from '$src/routes/Navbar/Avatar.svelte'
</script>

<div class="p-4">
  <div class="text-2xl m-4">My Account</div>

  <div class="m-4">
    Your email: <span class="text-success font-bold">{$userStore?.email}</span>
  </div>
  <div class="m-4">
    Your plan: <span class="text-success font-bold">{PLAN_NAMES[$userSubscriptionType]}</span>
  </div>
  <div class="m-4">
    Allowed instances: {$userStore?.subscription_quantity} (<a href="/support" class="text-primary">request more</a>)
  </div>
  <div>
    <wa-button href="https://gravatar.com/profile" variant="neutral" class="m-4">
      <Avatar class="w-5 h-5" />
      Update Avatar
    </wa-button>
  </div>

  <div>
    <wa-button href="https://store.pockethost.io/billing" variant="neutral" class="m-4" target="_blank">
      Manage Membership
    </wa-button>
  </div>
</div>
