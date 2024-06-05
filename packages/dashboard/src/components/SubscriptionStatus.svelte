<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from '$shared'
  import { isUserFounder, userSubscriptionType } from '$util/stores'

  isUserFounder

  export let handleClick: any = () => {}
</script>

<div class=" flex flex-col gap-4 mb-4">
  <div
    class="card bg-accent shadow-xl rounded-lg overflow-hidden bg-[url('/images/pockethost-cloud-logo.jpg')]"
  >
    <div class="card-body backdrop-blur-md text-white">
      <h2 class="card-title">
        {$isUserFounder ? `Founder` : PLAN_NAMES[$userSubscriptionType]}
      </h2>

      {#if $userSubscriptionType === SubscriptionType.Free}
        <p>
          You're on the free Hacker plan. Unlock more features such as unlimited
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
          You're on the Legacy plan. Everything works, but you can't create new
          projects. Unlock more features by supporting PocketHost. This plan may
          be sunset eventually.
        </p>

        <div class="card-actions justify-end">
          <a class="btn btn-primary" href="/account" on:click={handleClick}
            >Unlock</a
          >
        </div>
      {/if}

      {#if $userSubscriptionType === SubscriptionType.Premium && !$isUserFounder}
        <p>
          Your Pro membership is active. Thank you for supporting PocketHost!
        </p>
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
