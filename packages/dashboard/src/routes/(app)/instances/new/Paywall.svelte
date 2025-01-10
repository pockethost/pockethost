<script lang="ts">
  import { userSubscriptionType, userStore } from '$util/stores'
  import { PLAN_NAMES } from 'pockethost/common'

  $: maxInstances = $userStore?.subscription_quantity || 0
</script>

<div class="card max-w-sm bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Paywall!</h2>
    <p>Oof. You hit a paywall.</p>
    <p class="text-error">
      You're only allowed {maxInstances} projects on the {PLAN_NAMES[
        $userSubscriptionType
      ]} plan.
    </p>
    <p>
      But that's okay, we know you want to support PocketHost if you love it
      this much!
    </p>
    <div class="card-actions justify-end">
      <a href="/pricing" class="btn btn-primary">Unlock More Projects</a>
    </div>
  </div>
</div>
