<script lang="ts">
  import { userSubscriptionType } from '$util/stores'
  import { SubscriptionType } from 'pockethost'
</script>

<div class="card max-w-sm bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Paywall!</h2>
    <p>Oof. You hit a paywall.</p>
    {#if $userSubscriptionType === SubscriptionType.Free}
      <p class="text-error">You're only allowed 1 project on the Free plan.</p>
    {/if}
    {#if $userSubscriptionType === SubscriptionType.Legacy}
      <p class="text-error">You can't add new projects to the Legacy plan.</p>
    {/if}
    <p>
      But that's okay, we know you want to support PocketHost if you love it
      this much!
    </p>
    <div class="card-actions justify-end">
      <a href="/account" class="btn btn-primary">Unlock Unlimited Projects</a>
    </div>
  </div>
</div>
