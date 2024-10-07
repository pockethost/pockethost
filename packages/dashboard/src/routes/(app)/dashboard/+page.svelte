<script lang="ts">
  import { MAX_INSTANCE_COUNTS } from '$src/env'
  import { globalInstancesStore, userSubscriptionType } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import InstanceList from './InstanceList.svelte'
  import { SubscriptionType } from 'pockethost'
  import { faPlus } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  $: instanceCount = values($globalInstancesStore).length
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-4xl text-base-content font-bold capitalize">Dashboard</h2>

  <a href="/instances/new" class="m-3 btn btn-primary">
    <Fa icon={faPlus} /> New Instance</a
  >
</div>

<div class="flex flex-row space-x-4 items-center justify-center">
  <div>Instances</div>
  <progress
    class="progress progress-primary w-56"
    value={instanceCount}
    max={MAX_INSTANCE_COUNTS[$userSubscriptionType]}
  ></progress>
  <div>
    {instanceCount}/{MAX_INSTANCE_COUNTS[$userSubscriptionType]}
    {#if $userSubscriptionType === SubscriptionType.Free}
      <a href="/pricing" class="link text-xs text-success">upgrade</a>
    {/if}
  </div>
</div>

<div class="flex flex-wrap gap-2 items-center justify-center">
  <InstanceList />
</div>
