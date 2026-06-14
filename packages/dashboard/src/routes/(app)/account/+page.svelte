<script lang="ts">
  import { PLAN_NAMES } from 'pockethost/common'
  import Avatar from '$src/routes/Navbar/Avatar.svelte'
  import { userStore, userSubscriptionType } from '$util/stores'
</script>

<svelte:head>
  <title>Account - PocketHost</title>
</svelte:head>

<h2 class="text-xl font-bold text-white mb-6">Account</h2>

<wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="p-6 md:p-8">
    <div class="flex flex-col sm:flex-row sm:items-start gap-6 md:gap-8">
      <div class="flex flex-col items-center gap-3 shrink-0 sm:pt-0.5">
        <Avatar size={80} class="ring-2 ring-white/10" />
        <wa-button
          href="https://gravatar.com/profile"
          variant="neutral"
          size="small"
          appearance="outline"
          target="_blank"
          class="min-w-[5rem]"
        >
          <wa-icon slot="start" name="image"></wa-icon>
          Gravatar
        </wa-button>
      </div>

      <div class="flex-1 min-w-0">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          <div class="rounded-lg bg-white/5 border border-white/5 px-4 py-3">
            <dt class="text-xs font-medium uppercase tracking-wide text-white/50 mb-1">Email</dt>
            <dd class="text-white font-medium truncate">{$userStore?.email}</dd>
          </div>
          <div class="rounded-lg bg-white/5 border border-white/5 px-4 py-3">
            <dt class="text-xs font-medium uppercase tracking-wide text-white/50 mb-1">Plan</dt>
            <dd class="text-primary font-semibold">{PLAN_NAMES[$userSubscriptionType]}</dd>
          </div>
          <div class="rounded-lg bg-white/5 border border-white/5 px-4 py-3 sm:col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-white/50 mb-1">Instances</dt>
            <dd class="text-white">
              <span class="font-semibold tabular-nums">{$userStore?.subscription_quantity}</span>
              <span class="text-white/50"> allowed</span>
              <span class="text-white/30 mx-2">·</span>
              <a href="/support" class="text-primary text-sm hover:underline">Request more</a>
            </dd>
          </div>
        </dl>

        <div class="mt-6 pt-6 border-t border-white/10">
          <wa-button href="https://store.pockethost.io/billing" variant="brand" appearance="outline" target="_blank">
            <wa-icon slot="start" name="credit-card"></wa-icon>
            Manage membership
          </wa-button>
        </div>
      </div>
    </div>
  </div>
</wa-card>
