<script lang="ts">
  import { userSubscriptionType, userStore } from '$util/stores'
  import { PLAN_NAMES } from 'pockethost/common'

  $: maxInstances = $userStore?.subscription_quantity || 0
</script>

<div class="card max-w-sm bg-[#111111]/80 border border-white/10 shadow-md">
  <div class="card-body">
    <h2 class="card-title">Paywall!</h2>
    <p>Oof. You hit a paywall because you are out of instances.</p>
    <div class="card-actions w-full mt-6">
      <a href="/access" class="btn w-full bg-primary hover:bg-light">Unlock more</a>
    </div>
  </div>
</div>
