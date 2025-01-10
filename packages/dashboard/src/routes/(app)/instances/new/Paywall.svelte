<script lang="ts">
  import { userSubscriptionType, userStore } from '$util/stores'
  import { PLAN_NAMES } from 'pockethost/common'

  $: maxInstances = $userStore?.subscription_quantity || 0
</script>

<div class="card max-w-sm bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Paywall!</h2>
    <p>Oof. You hit a paywall because you are out of instances.</p>

    <div class="card-actions justify-end">
      <a href="/access" class="btn btn-primary">Unlock</a>
    </div>
  </div>
</div>
