<script lang="ts">
  import { writable } from 'svelte/store'

  export let name = ''
  export let description = ''
  export let priceMonthly: [number, string?] = [0, '']
  export let priceAnnually: [number, string?] = [0, '']
  export let checkoutMonthURL = ''
  export let checkoutYearURL = ''
  export let active = false
  export let founderMembershipsRemaining = writable(0)
</script>

<div
  class={`flex flex-col rounded-3xl p-8 xl:p-10 ${
    active ? 'bg-white/5 ring-2 ring-primary' : 'ring-1 ring-white/10'
  }`}
>
  <div class="flex items-center justify-between gap-x-4">
    <h2 id="tier-startup" class="text-lg font-semibold leading-8 text-white">
      {name}
    </h2>

    {#if active}
      <p
        class="rounded-full border-primary border px-2.5 py-1 text-xs font-semibold leading-5 text-white"
      >
        Your Plan
      </p>
    {/if}
  </div>

  {#if $founderMembershipsRemaining}
    <p
      class="animate-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 bg-clip-text text-transparent text-xl font-black"
    >
      <i class="fa-regular fa-clock"></i>
      {$founderMembershipsRemaining}/100 Remaining
    </p>
  {/if}

  <p class="mt-4 mb-8 text-sm leading-6 text-gray-300">{description}</p>

  {#if priceMonthly[0] === 0}
    <p class="mt-6 mb-12 flex items-baseline gap-x-1">
      <span class="text-4xl font-bold tracking-tight text-white">Free</span>
    </p>
  {/if}

  <div class="mt-auto">
    {#if priceMonthly[0] > 0 && priceAnnually[0] > 0}
      <a
        href={checkoutMonthURL}
        class="mt-auto mb-4 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white"
      >
        <span class="text-xl font-bold tracking-tight text-white">
          ${priceMonthly[0]}
        </span>
        <span class="text-sm font-semibold leading-6 text-gray-300">
          / {priceMonthly[1]}</span
        >
      </a>

      <a
        href={checkoutYearURL}
        class="block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white"
      >
        <span class="text-xl font-bold tracking-tight text-white">
          ${priceAnnually[0]}
        </span>
        <span class="text-sm font-semibold leading-6 text-gray-300">
          / {priceAnnually[1]}</span
        >
      </a>
    {/if}
  </div>
</div>
