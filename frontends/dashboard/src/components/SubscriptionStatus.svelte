<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from '$shared'
  import { isUserFounder, userSubscriptionType } from '$util/stores'
  isUserFounder
  export let handleClick: any
</script>

<div class=" flex flex-col gap-4 mb-4">
  <div class="card bg-accent shadow-xl">
    <div class="card-body">
      <h2 class="card-title">
        {PLAN_NAMES[$userSubscriptionType]}
      </h2>
      {#if $userSubscriptionType === SubscriptionType.Free}
        <p>
          You're on the free plan. Unlock more features such as unlimited
          projects.
        </p>
        <div class="card-actions justify-end">
          <a class="btn btn-primary" href="/account" on:click={handleClick}
            >Unlock</a
          >
        </div>
      {/if}
      {#if $userSubscriptionType === SubscriptionType.Legacy}
        <p>
          You're on the legacy plan. Unlock more features by supporting
          PocketHost. This plan may be sunset eventually.
        </p>
        <div class="card-actions justify-end">
          <a class="btn btn-primary" href="/account" on:click={handleClick}
            >Unlock</a
          >
        </div>
      {/if}
      {#if $userSubscriptionType === SubscriptionType.Premium && !$isUserFounder}
        <p>Your membership is active. Thank you for supporting PocketHost!</p>
      {/if}

      {#if $isUserFounder}
        <p>
          What an absolute chad you are. Thank you for supporting PocketHost
          with a Founder's membership!
        </p>
      {/if}
    </div>
  </div>
</div>
