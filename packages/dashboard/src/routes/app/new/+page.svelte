<script lang="ts">
  import { globalInstancesStore, userSubscriptionType } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import { SubscriptionType } from 'pockethost/common'
  import Creator from './Creator.svelte'
  import Paywall from './Paywall.svelte'

  let instanceCount = 0
  let canCreate = false
  $: {
    instanceCount = values($globalInstancesStore).length
    canCreate =
      [SubscriptionType.Lifetime, SubscriptionType.Premium].includes(
        $userSubscriptionType,
      ) || instanceCount === 0
  }
</script>

<svelte:head>
  <title>New Instance - PocketHost</title>
</svelte:head>

<h2 class="text-4xl text-base-content font-bold capitalize mb-6">
  Create A New App
</h2>

{#if canCreate}
  <Creator />
{:else}
  <Paywall />
{/if}
