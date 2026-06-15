<script lang="ts">
  import { globalInstancesStore, userSubscriptionType, userStore } from '$util/stores'
  import InstanceList from './InstanceList.svelte'
  import { SubscriptionType } from 'pockethost/common'

  $: maxInstances = $userStore?.subscription_quantity || 0
  $: instanceCount = Object.values($globalInstancesStore).length
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<div class="flex flex-row items-center justify-between mt-6 mb-4 md:mb-6 gap-4">
  <h2 class="text-2xl md:text-4xl text-white font-bold capitalize">Dashboard</h2>

  <div class="group">
    <div class="h-full relative">
      <wa-button
        href={instanceCount >= maxInstances ? '#' : '/instances/new'}
        variant="brand"
        class="my-3 {instanceCount >= maxInstances ? 'pointer-events-none opacity-60' : ''}"
      >
        <wa-icon slot="start" name="plus"></wa-icon>
        New Instance
      </wa-button>
      <div
        class="hidden group-hover:block absolute top-full right-0 bg-[#111111]/80 border border-white/10 backdrop-blur-sm p-4 rounded-xl shadow-lg w-64 z-20 {instanceCount >=
          maxInstances && 'border-red-400'}"
      >
        {#if maxInstances > 0}
          {#if instanceCount > maxInstances}
            <p class="text-center text-sm text-error">You have exceeded your instance limit.</p>
          {/if}
          <div class="flex flex-col items-center justify-center">
            {#if instanceCount <= maxInstances}
              <div class="text-sm opacity-6.0">Instances</div>
            {/if}

            <div class="text-2xl font-bold">
              {#if $userSubscriptionType === SubscriptionType.Founder}
                {instanceCount}/<a
                  href="https://discord.com/channels/1128192380500193370/1128192380500193373/1296340516044017718"
                  class="text-primary"
                  target="_blank">{maxInstances}</a
                >
              {:else}
                {instanceCount}/{maxInstances}
              {/if}
            </div>
            <wa-progress-bar class="mt-2 w-full" value={instanceCount} max={maxInstances}></wa-progress-bar>
          </div>
          {#if instanceCount >= maxInstances}
            <wa-button href="/support" variant="brand" size="small" class="mt-2 w-full text-xs">
              Increase your limit
            </wa-button>
          {/if}
        {:else}
          <div class="text-sm opacity-6.0">You need to upgrade before creating more Instances</div>

          <wa-button href="/access" variant="brand" size="small" class="mt-2 w-full text-xs">Upgrade!</wa-button>
        {/if}
      </div>
    </div>
  </div>
</div>

<InstanceList />
