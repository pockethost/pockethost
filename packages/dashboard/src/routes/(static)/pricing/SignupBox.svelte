<script lang="ts">
  import { userStore, isUserLoggedIn } from '$util/stores'
  import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  export let selected: boolean = false
  export let buttonText: string = 'Subscribe Now'
  export let price: string
  export let priceDetail: string = ''
  export let bestDeal: boolean = false
  export let title: string
  export let cta: string
  export let features: string[]
</script>


<div
  class="bg-black/60 flex flex-col cursor-pointer text-white rounded-2xl p-8 w-full max-w-sm shadow-lg transform transition-transform duration-300 hover:-translate-y-2 border {selected ? 'border-yellow-400' : 'border-neutral-800'}"
>
{#if bestDeal}
      <div class="absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-400 text-black rounded-full">
        HOT
      </div>
    {/if}
  <div class="space-y-4 pb-4 border-b border-white/10">
    
    <h3 class={"text-2xl text-center font-semibold"}>{title}</h3>
    <p class="text-sm text-gray-300">{cta}</p>
  </div>

  <ul class="flex flex-col gap-2 mb-6 mt-4 flex-1"  >
    {#each features as feature}
      <li class="flex items-start gap-2 text-sm">
        <Fa
          icon={feature.startsWith('-') ? faXmark : faCheck}
          class={feature.startsWith('-') ? 'text-red-500 mt-1' : 'text-green-400 mt-1'}
        />
        <span class={feature.startsWith('-') ? 'line-through text-gray-500' : ''}>
          {feature.replace('-', '')}
        </span>
      </li>
    {/each}
  </ul>

  <div class="mb-4 text-center">
    <div class="text-3xl font-bold">{price}</div>
    {#if priceDetail}
      <div class="text-xs text-gray-400">{priceDetail}</div>
    {/if}
  </div>

  <div class="flex justify-center">
    <a
      href={$isUserLoggedIn
        ? `https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`
        : `javascript:alert('You must be logged in to subscribe')`}
      class="btn rounded-full px-6 py-2 text-sm font-semibold transition-colors w-full duration-200 
        {selected ? 'bg-yellow-400 text-black hover:bg-yellow-300 wiggle' : 'bg-neutral-800 text-white hover:bg-neutral-700'}"
    >
      {buttonText}
    </a>
  </div>
</div>

