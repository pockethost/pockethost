<script lang="ts">
  import { globalInstancesStore, userSubscriptionType, userStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import InstanceList from './InstanceList.svelte'
  import { SubscriptionType } from 'pockethost/common'
  import { faPlus } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  // $: maxInstances = 25
  $: maxInstances = $userStore?.subscription_quantity || 0
  $: instanceCount = values($globalInstancesStore).length
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<div class="flex flex-row items-center justify-between my-6 gap-4">
  <h2 class="text-2xl md:text-4xl text-base-content font-bold capitalize">Dashboard</h2>

  <div class="group">
    <div class="h-full relative">
      <a href="{instanceCount >= maxInstances ? "#" : "/instances/new"}" class="my-3 btn relative {instanceCount >= maxInstances ? "bg-slate-800 hover:bg-slate-800 pointer-events-none border hover:border-white/40" :  "bg-primary hover:bg-light "}">
        <Fa icon={faPlus} /> New Instance
      </a>
      <div
        class="hidden group-hover:block absolute top-full right-0 bg-[#111111]/80 border border-white/10 backdrop-blur-sm p-4 rounded-xl shadow-lg w-64 z-10 {instanceCount >= maxInstances && "border-red-400"}"
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
                  class="link"
                  target="_blank">{maxInstances}</a
                >
              {:else}
                {instanceCount}/{maxInstances}
              {/if}
            </div>
            <progress
              class="progress mt-2 
                {instanceCount >= maxInstances ? 'progress-error' : 
                  instanceCount >= maxInstances * 0.75 ? 'progress-warning' : 
                  'progress-primary'} w-full"
              value={instanceCount}
              max={maxInstances}
            ></progress>
           
          </div>
          {#if instanceCount >= maxInstances}
            <a href="/support" class="link btn btn-sm mt-2 w-full text-xs bg-primary no-underline hover:bg-light">Increase your limit</a>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-3 gap-4 items-center justify-center">
  <InstanceList />
</div>
