<script lang="ts">
  import {
    globalInstancesStore,
    isUserPaid,
    userSubscriptionType,
  } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import { SubscriptionType } from 'pockethost/common'
  import Creator from './Creator.svelte'
  import Paywall from './Paywall.svelte'
  import { MAX_INSTANCE_COUNTS } from '$src/env'

  let instanceCount = 0
  let canCreate = false
  $: {
    console.log(MAX_INSTANCE_COUNTS[$userSubscriptionType])
    instanceCount = values($globalInstancesStore).length
    canCreate = instanceCount < MAX_INSTANCE_COUNTS[$userSubscriptionType]
  }
</script>

<svelte:head>
  <title>New Instance - PocketHost</title>
</svelte:head>

<div class="flex items-center justify-center">
  <div class="max-w-md">
    <h2 class="text-4xl text-base-content font-bold capitalize mb-6">
      Create A New Instance
    </h2>

    {#if canCreate}
      <Creator />
    {:else}
      <Paywall />
    {/if}
  </div>
</div>
