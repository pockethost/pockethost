<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from '$shared'

  export let name = ''
  export let description = ''
  export let priceMonthly = 0
  export let priceAnnually = 0
  export let planSchedule = ''
  export let checkoutMonthURL = ''
  export let checkoutYearURL = ''
  export let active = false
  export let features: string[] = []
</script>

<div
  class={`rounded-3xl p-8 xl:p-10 ${
    active ? 'bg-white/5 ring-2 ring-primary' : 'ring-1 ring-white/10'
  }`}
>
  <div class="flex items-center justify-between gap-x-4">
    <h2 id="tier-startup" class="text-lg font-semibold leading-8 text-white">
      {name}
    </h2>

    {#if active}
      <p
        class="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold leading-5 text-white"
      >
        Your Plan
      </p>
    {/if}
  </div>

  <p class="mt-4 text-sm leading-6 text-gray-300">{description}</p>

  <p class="mt-6 flex items-baseline gap-x-1">
    {#if priceMonthly === 0}
      <span class="text-4xl font-bold tracking-tight text-white">Free</span>
    {:else if priceMonthly === priceAnnually}
      <span class="text-4xl font-bold tracking-tight text-white">$300</span>
      <span class="text-sm font-semibold leading-6 text-gray-300">
        one time</span
      >
    {:else}
      <span class="text-4xl font-bold tracking-tight text-white">
        {#if planSchedule === 'month'}
          ${priceMonthly}
        {:else}
          ${priceAnnually}
        {/if}
      </span>
      <span class="text-sm font-semibold leading-6 text-gray-300">
        / {planSchedule}</span
      >
    {/if}
  </p>

  {#if !active}
    <a
      href={planSchedule === 'month' ? checkoutMonthURL : checkoutYearURL}
      aria-describedby="tier-freelancer"
      class="mt-6 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white"
      >Switch to this plan</a
    >
  {/if}

  <ul
    role="list"
    class="mt-8 space-y-3 text-sm leading-6 text-gray-300 xl:mt-10"
  >
    {#each features as feature}
      <li class="flex items-center gap-x-3">
        <i class="fa-light fa-check"></i>
        {feature}
      </li>
    {/each}
  </ul>
</div>
