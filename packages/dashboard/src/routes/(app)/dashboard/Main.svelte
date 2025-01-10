<script lang="ts">
  import {
    globalInstancesStore,
    userSubscriptionType,
    userStore,
  } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import InstanceList from './InstanceList.svelte'
  import { SubscriptionType } from 'pockethost/common'
  import { faPlus } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  $: maxInstances = $userStore?.subscription_quantity || 0
  $: instanceCount = values($globalInstancesStore).length
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<div
  class="flex flex-row items-center justify-between mb-6 gap-4 pl-4 sm:pl-6 lg:pl-8 pr-4"
>
  <h2 class="text-4xl text-base-content font-bold capitalize">Dashboard</h2>

  <a href="/instances/new" class="m-3 btn btn-primary">
    <Fa icon={faPlus} /> New Instance</a
  >
</div>

<div class="flex flex-col space-x-4 items-center justify-center">
  {#if maxInstances > 0}
    {#if instanceCount > maxInstances}
      <p class="text-center text-error">
        You have exceeded your instance limit.
      </p>
    {/if}
    <div class="flex flex-row space-x-4 items-center justify-center">
      <div>Instances</div>
      <progress
        class="progress {instanceCount > maxInstances
          ? 'progress-error'
          : 'progress-primary'} w-48 md:w-80"
        value={instanceCount}
        max={maxInstances}
      ></progress>
      <div>
        {#if $userSubscriptionType === SubscriptionType.Founder}
          {instanceCount}/<a
            href="https://discord.com/channels/1128192380500193370/1128192380500193373/1296340516044017718"
            class="link"
            target="_blank">{maxInstances}</a
          >
        {:else}
          {instanceCount}/{maxInstances}
        {/if}
        {#if instanceCount >= maxInstances}
          <a href="/support" class="link text-xs text-success">Upgrade</a>
        {/if}
      </div>
    </div>
  {/if}
</div>

<div class="flex flex-wrap gap-2 items-center justify-center">
  <InstanceList />
</div>
