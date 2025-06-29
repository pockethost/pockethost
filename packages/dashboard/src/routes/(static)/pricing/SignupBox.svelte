<script lang="ts">
  import { userStore, isUserLoggedIn } from '$util/stores'
  import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  export let selected: boolean = false
  export let buttonText: string = 'Subscribe Now'
  export let price: string
  export let priceDetail: string=''
  export let bestDeal: boolean = false
  export let title: string
  export let cta: string
  export let features: string[]
</script>

<div
  class="bg-neutral text-neutral-content rounded-xl p-7 pl-5 pr-5 prose w-72 mb-10 {selected
    ? 'border-2 border-warning'
    : ''} transition-all duration-300"
>
  <div class="h-40 flex flex-col justify-start">
    {#if bestDeal}
      <div class="text-sm text-warning text-center">Best Deal</div>
    {/if}
    <div class="text-xl text-white text-center">{title}</div>
    <div>
      {cta}
    </div>
  </div>
  <div class="h-52">
    {#each features as feature}
      <div class="flex flex-row gap-2">
        <Fa
          icon={feature.startsWith('-') ? faXmark : faCheck}
          class={feature.startsWith('-') ? 'text-error' : 'text-primary'}
        /><span class="text-white text-sm">{feature.replace('-', '')}</span>
      </div>
    {/each}
  </div>
  <div class="h-12 flex justify-start items-center flex-col">
    <div class="text-3xl text-white text-center ">{price}</div>
    <div class="text-xs text-gray-400 text-center">{priceDetail}</div>
  </div>
  <div class="h-16 flex justify-center items-end">
    <a
      href={$isUserLoggedIn
        ? `https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`
        : `javascript:alert('You must be logged in to subscribe')`}
      class="btn {selected
        ? 'btn-warning'
        : 'btn-neutral bg-neutral-700 text-white'} rounded-full"
    >
      {buttonText}
    </a>
  </div>
</div>
